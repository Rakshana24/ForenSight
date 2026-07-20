'use strict';

const seasonConfig = require('../config/seasonal.config');

class AnalyticsService {
  constructor(zcql) {
    this.zcql = zcql;
  }

  /**
   * Helper to execute ZCQL query and flatten result rows
   */
  async executeZCQL(query) {
    try {
      const rawRows = await this.zcql.executeZCQLQuery(query);
      if (!rawRows || rawRows.length === 0) return [];
      
      return rawRows.map(row => {
        if (!row) return null;
        let flattened = {};
        for (const [tableName, columns] of Object.entries(row)) {
          flattened = { ...flattened, ...columns };
        }
        return flattened;
      }).filter(Boolean);
    } catch (error) {
      console.error('[AnalyticsService] ZCQL Error:', error.message, '| Query:', query);
      const err = new Error(`Database query error: ${error.message}`);
      err.statusCode = 500;
      throw err;
    }
  }

  /**
   * Fetches metadata to populate frontend filter dropdown options
   */
  async getFilterOptions() {
    const districts = await this.executeZCQL('SELECT ROWID, DistrictID, DistrictName FROM District');
    const stations = await this.executeZCQL('SELECT ROWID, UnitID, UnitName, DistrictID FROM Unit');
    const crimeTypes = await this.executeZCQL('SELECT ROWID, CrimeHeadID, CrimeGroupName FROM CrimeHead');
    const crimeSubHeads = await this.executeZCQL('SELECT ROWID, CrimeSubHeadID, CrimeHeadID, CrimeHeadName FROM CrimeSubHead');

    return {
      districts,
      stations,
      crimeTypes, // Keep for backward compatibility with Trends
      crimeCategories: crimeTypes,
      crimeSubHeads
    };
  }

  /**
   * Computes Daily, Monthly, Yearly, and Crime-wise trend aggregations
   */
  async getTrendData(filters) {
    const { startDate, endDate, crimeType, district, policeStation, year, month } = filters;
    const whereClauses = [];

    // Filter by Date Range
    if (startDate) {
      whereClauses.push(`CrimeRegisteredDate >= '${startDate}'`);
    }
    if (endDate) {
      whereClauses.push(`CrimeRegisteredDate <= '${endDate}'`);
    }

    // Filter by Crime Type
    if (crimeType) {
      whereClauses.push(`CrimeMajorHeadID = '${crimeType}'`);
    }

    // Filter by Police Station
    if (policeStation) {
      whereClauses.push(`PoliceStationID = '${policeStation}'`);
    }

    // Filter by District (Needs resolving stations inside that district first)
    if (district && !policeStation) {
      const stations = await this.executeZCQL(`SELECT ROWID FROM Unit WHERE DistrictID = '${district}'`);
      if (stations.length > 0) {
        const stationRowIds = stations.map(s => `'${s.ROWID}'`).join(',');
        whereClauses.push(`PoliceStationID IN (${stationRowIds})`);
      } else {
        // If the district has no stations, force 0 results
        whereClauses.push("PoliceStationID = '0'");
      }
    }

    // Filter by Year
    if (year) {
      whereClauses.push(`CrimeRegisteredDate >= '${year}-01-01'`);
      whereClauses.push(`CrimeRegisteredDate <= '${year}-12-31'`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const baseQuery = `SELECT CrimeRegisteredDate, CrimeMajorHeadID, PoliceStationID FROM CaseMaster ${whereString}`;

    // Execute case fetch
    const cases = await this.executePaginatedZCQL(baseQuery);

    // Fetch Crime Head names for mapping
    const crimeHeads = await this.executeZCQL('SELECT ROWID, CrimeGroupName FROM CrimeHead');
    const crimeHeadMap = new Map();
    crimeHeads.forEach(ch => {
      crimeHeadMap.set(ch.ROWID, ch.CrimeGroupName);
    });

    // In-memory filtering for Month (which can't be easily parsed by SQLite string extraction in ZCQL)
    let filteredCases = cases;
    if (month) {
      const monthStr = month.toString().padStart(2, '0');
      filteredCases = cases.filter(c => {
        if (!c.CrimeRegisteredDate) return false;
        // CrimeRegisteredDate is YYYY-MM-DD
        const parts = c.CrimeRegisteredDate.split('-');
        return parts[1] === monthStr;
      });
    }

    if (filteredCases.length === 0) {
      return {
        totalRecords: 0,
        dateRange: 'No records',
        trends: {
          Daily: { labels: [], values: [] },
          Monthly: { labels: [], values: [] },
          Yearly: { labels: [], values: [] },
          'Crime-wise': { labels: [], values: [] }
        },
        stats: {
          totalCrimes: 0,
          highestMonth: 'N/A',
          highestDay: 'N/A',
          highestYear: 'N/A',
          mostFrequentType: 'N/A',
          avgCrimes: 0
        }
      };
    }

    // Extract Date range
    const dates = filteredCases
      .map(c => c.CrimeRegisteredDate)
      .filter(Boolean)
      .sort((a, b) => new Date(a) - new Date(b));
    const dateRange = dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : 'N/A';

    // 1. Group daily
    const dailyMap = {};
    filteredCases.forEach(c => {
      if (c.CrimeRegisteredDate) {
        dailyMap[c.CrimeRegisteredDate] = (dailyMap[c.CrimeRegisteredDate] || 0) + 1;
      }
    });

    // 2. Group monthly
    const monthlyMap = {};
    filteredCases.forEach(c => {
      if (c.CrimeRegisteredDate) {
        const monthKey = c.CrimeRegisteredDate.substring(0, 7); // YYYY-MM
        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + 1;
      }
    });

    // 3. Group yearly
    const yearlyMap = {};
    filteredCases.forEach(c => {
      if (c.CrimeRegisteredDate) {
        const yearKey = c.CrimeRegisteredDate.substring(0, 4); // YYYY
        yearlyMap[yearKey] = (yearlyMap[yearKey] || 0) + 1;
      }
    });

    // 4. Group crime-wise
    const crimeWiseMap = {};
    filteredCases.forEach(c => {
      const crimeName = crimeHeadMap.get(c.CrimeMajorHeadID) || 'Unknown Crime Type';
      crimeWiseMap[crimeName] = (crimeWiseMap[crimeName] || 0) + 1;
    });

    // Formulate chronological sort helpers
    const sortKeys = obj => Object.keys(obj).sort((a, b) => a.localeCompare(b));

    const dailyLabels = sortKeys(dailyMap);
    const monthlyLabels = sortKeys(monthlyMap);
    const yearlyLabels = sortKeys(yearlyMap);
    const crimeLabels = Object.keys(crimeWiseMap).sort((a, b) => crimeWiseMap[b] - crimeWiseMap[a]);

    // Find highest stats
    const findMax = (map) => {
      let maxKey = 'N/A';
      let maxValue = 0;
      for (const [key, val] of Object.entries(map)) {
        if (val > maxValue) {
          maxValue = val;
          maxKey = key;
        }
      }
      return maxValue > 0 ? `${maxKey} (${maxValue} cases)` : 'N/A';
    };

    const highestDay = findMax(dailyMap);
    const highestMonth = findMax(monthlyMap);
    const highestYear = findMax(yearlyMap);
    const mostFrequentType = findMax(crimeWiseMap);

    const totalCrimes = filteredCases.length;

    return {
      totalRecords: totalCrimes,
      dateRange,
      trends: {
        Daily: {
          labels: dailyLabels,
          values: dailyLabels.map(l => dailyMap[l])
        },
        Monthly: {
          labels: monthlyLabels,
          values: monthlyLabels.map(l => monthlyMap[l])
        },
        Yearly: {
          labels: yearlyLabels,
          values: yearlyLabels.map(l => yearlyMap[l])
        },
        'Crime-wise': {
          labels: crimeLabels,
          values: crimeLabels.map(l => crimeWiseMap[l])
        }
      },
      stats: {
        totalCrimes,
        highestMonth,
        highestDay,
        highestYear,
        mostFrequentType,
        avgCrimes: 0
      }
    };
  }

  /**
   * Helper to execute ZCQL query paginated
   */
  async executePaginatedZCQL(query) {
    try {
      let allRows = [];
      let limit = 200;
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const paginatedQuery = `${query} LIMIT ${limit} OFFSET ${offset}`;
        const rows = await this.executeZCQL(paginatedQuery);
        allRows = allRows.concat(rows);
        if (rows.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }
      return allRows;
    } catch (err) {
      console.warn('[AnalyticsService] Paginated fetch failed, falling back to direct query:', err.message);
      return await this.executeZCQL(query);
    }
  }

  /**
   * Computes hotspot statistics and ranking aggregations for locations, districts, stations, and crime types
   */
  async getHotspotData(filters) {
    const { startDate, endDate, crimeType, crimeCategory, district, policeStation, year, month } = filters;
    const whereClauses = [];

    // Filter by Date Range
    if (startDate) {
      whereClauses.push(`CrimeRegisteredDate >= '${startDate}'`);
    }
    if (endDate) {
      whereClauses.push(`CrimeRegisteredDate <= '${endDate}'`);
    }

    // Filter by Crime Category (CrimeMajorHeadID)
    if (crimeCategory) {
      whereClauses.push(`CrimeMajorHeadID = '${crimeCategory}'`);
    }

    // Filter by Crime Type (CrimeMinorHeadID)
    if (crimeType) {
      whereClauses.push(`CrimeMinorHeadID = '${crimeType}'`);
    }

    // Filter by Police Station
    if (policeStation) {
      whereClauses.push(`PoliceStationID = '${policeStation}'`);
    }

    // Filter by District
    if (district && !policeStation) {
      const stations = await this.executeZCQL(`SELECT ROWID FROM Unit WHERE DistrictID = '${district}'`);
      if (stations.length > 0) {
        const stationRowIds = stations.map(s => `'${s.ROWID}'`).join(',');
        whereClauses.push(`PoliceStationID IN (${stationRowIds})`);
      } else {
        whereClauses.push("PoliceStationID = '0'");
      }
    }

    // Filter by Year
    if (year) {
      whereClauses.push(`CrimeRegisteredDate >= '${year}-01-01'`);
      whereClauses.push(`CrimeRegisteredDate <= '${year}-12-31'`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const baseQuery = `SELECT CrimeRegisteredDate, CrimeMajorHeadID, CrimeMinorHeadID, PoliceStationID, latitude, longitude FROM CaseMaster ${whereString}`;

    // Execute paginated fetch
    const cases = await this.executePaginatedZCQL(baseQuery);

    // Fetch metadata for name mapping
    const districts = await this.executeZCQL('SELECT ROWID, DistrictName FROM District');
    const stations = await this.executeZCQL('SELECT ROWID, UnitName, DistrictID FROM Unit');
    const crimeHeads = await this.executeZCQL('SELECT ROWID, CrimeGroupName FROM CrimeHead');
    const crimeSubHeads = await this.executeZCQL('SELECT ROWID, CrimeHeadName FROM CrimeSubHead');

    // Create lookup maps
    const districtMap = {};
    districts.forEach(d => { districtMap[d.ROWID] = d.DistrictName; });

    const unitMap = {};
    stations.forEach(s => { unitMap[s.ROWID] = { UnitName: s.UnitName, DistrictID: s.DistrictID }; });

    const crimeHeadMap = {};
    crimeHeads.forEach(ch => { crimeHeadMap[ch.ROWID] = ch.CrimeGroupName; });

    const crimeSubHeadMap = {};
    crimeSubHeads.forEach(csh => { crimeSubHeadMap[csh.ROWID] = csh.CrimeHeadName; });

    // Filter in-memory by Month
    let filteredCases = cases;
    if (month) {
      const monthStr = month.toString().padStart(2, '0');
      filteredCases = cases.filter(c => {
        if (!c.CrimeRegisteredDate) return false;
        const parts = c.CrimeRegisteredDate.split('-');
        return parts[1] === monthStr;
      });
    }

    const totalCrimes = filteredCases.length;

    if (totalCrimes === 0) {
      return {
        totalRecords: 0,
        summary: {
          totalCrimes: 0,
          highestDistrict: 'N/A',
          highestStation: 'N/A',
          highestLocation: 'N/A',
          totalHotspots: 0,
          mostCommonCrimeType: 'N/A',
          avgCrimesPerHotspot: 0
        },
        rankings: {
          districts: [],
          stations: [],
          locations: [],
          crimeCategories: [],
          crimeTypes: []
        }
      };
    }

    // Accumulators for aggregation
    const districtCounts = {};
    const stationCounts = {};
    const locationCounts = {};
    const categoryCounts = {};
    const typeCounts = {};

    filteredCases.forEach(c => {
      const date = c.CrimeRegisteredDate;
      const stationInfo = unitMap[c.PoliceStationID] || { UnitName: 'Unknown Station', DistrictID: null };
      const districtName = districtMap[stationInfo.DistrictID] || 'Unknown District';
      const stationName = stationInfo.UnitName;
      const categoryName = crimeHeadMap[c.CrimeMajorHeadID] || 'Unknown Category';
      const typeName = crimeSubHeadMap[c.CrimeMinorHeadID] || 'Unknown Type';
      const lat = c.latitude ? parseFloat(c.latitude) : null;
      const lng = c.longitude ? parseFloat(c.longitude) : null;

      // Group by District
      if (!districtCounts[districtName]) districtCounts[districtName] = [];
      districtCounts[districtName].push(date);

      // Group by Police Station
      if (!stationCounts[stationName]) stationCounts[stationName] = [];
      stationCounts[stationName].push(date);

      // Group by Crime Category
      if (!categoryCounts[categoryName]) categoryCounts[categoryName] = [];
      categoryCounts[categoryName].push(date);

      // Group by Crime Type
      if (!typeCounts[typeName]) typeCounts[typeName] = [];
      typeCounts[typeName].push(date);

      // Group by Location coords
      if (lat !== null && lng !== null) {
        const locationKey = `${lat},${lng}`;
        if (!locationCounts[locationKey]) {
          locationCounts[locationKey] = {
            lat,
            lng,
            stationName,
            districtName,
            dates: []
          };
        }
        locationCounts[locationKey].dates.push(date);
      }
    });

    const computeTrend = (dates) => {
      if (dates.length < 2) return 'Stable';
      const sortedDates = [...dates].sort((a, b) => new Date(a) - new Date(b));
      const mid = Math.floor(sortedDates.length / 2);
      const firstHalf = mid;
      const secondHalf = sortedDates.length - mid;
      if (secondHalf > firstHalf) {
        const pct = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
        return `+${pct}%`;
      } else if (secondHalf < firstHalf) {
        const pct = Math.round(((firstHalf - secondHalf) / firstHalf) * 100);
        return `-${pct}%`;
      } else {
        return 'Stable';
      }
    };

    const getRankings = (countsMap, isLocation = false) => {
      let list;
      if (isLocation) {
        list = Object.entries(countsMap).map(([key, data]) => {
          return {
            name: `Lat: ${data.lat}, Lng: ${data.lng} (${data.stationName})`,
            lat: data.lat,
            lng: data.lng,
            count: data.dates.length,
            dates: data.dates
          };
        });
      } else {
        list = Object.entries(countsMap).map(([name, dates]) => {
          return {
            name,
            count: dates.length,
            dates
          };
        });
      }

      list.sort((a, b) => b.count - a.count);
      
      const maxCount = list.length > 0 ? list[0].count : 1;

      return list.map((item, index) => {
        const pct = parseFloat(((item.count / totalCrimes) * 100).toFixed(1));
        const trend = computeTrend(item.dates);
        
        let density = 'Low';
        if (item.count >= maxCount * 0.8) density = 'High';
        else if (item.count >= maxCount * 0.4) density = 'Medium';

        const ranked = {
          rank: index + 1,
          name: item.name,
          count: item.count,
          percentage: pct,
          trend,
          density
        };

        if (isLocation) {
          ranked.lat = item.lat;
          ranked.lng = item.lng;
        }

        return ranked;
      });
    };

    const rankedDistricts = getRankings(districtCounts);
    const rankedStations = getRankings(stationCounts);
    const rankedLocations = getRankings(locationCounts, true);
    const rankedCategories = getRankings(categoryCounts);
    const rankedTypes = getRankings(typeCounts);

    // Summary Card Stats
    const highestDistrict = rankedDistricts.length > 0 ? rankedDistricts[0].name : 'N/A';
    const highestStation = rankedStations.length > 0 ? rankedStations[0].name : 'N/A';
    const highestLocation = rankedLocations.length > 0 ? rankedLocations[0].name : 'N/A';
    const mostCommonCrimeType = rankedTypes.length > 0 ? rankedTypes[0].name : 'N/A';
    const totalHotspots = rankedStations.length; // Total active hotspot police stations
    const avgCrimesPerHotspot = totalHotspots > 0 ? parseFloat((totalCrimes / totalHotspots).toFixed(1)) : 0;

    return {
      totalRecords: totalCrimes,
      summary: {
        totalCrimes,
        highestDistrict,
        highestStation,
        highestLocation,
        totalHotspots,
        mostCommonCrimeType,
        avgCrimesPerHotspot
      },
      rankings: {
        districts: rankedDistricts,
        stations: rankedStations,
        locations: rankedLocations,
        crimeCategories: rankedCategories,
        crimeTypes: rankedTypes
      }
    };
  }

  /**
   * Computes Crime Cluster Detection and growth analysis over comparison periods
   */
  async getClusterData(filters) {
    const { startDate, endDate, crimeType, crimeCategory, district, policeStation, year, month, interval = 'month' } = filters;
    const whereClauses = [];

    // Filter by Date Range
    if (startDate) {
      whereClauses.push(`CrimeRegisteredDate >= '${startDate}'`);
    }
    if (endDate) {
      whereClauses.push(`CrimeRegisteredDate <= '${endDate}'`);
    }

    // Filter by Crime Type
    if (crimeType) {
      whereClauses.push(`CrimeMinorHeadID = '${crimeType}'`);
    }

    // Filter by Crime Category
    if (crimeCategory) {
      whereClauses.push(`CrimeMajorHeadID = '${crimeCategory}'`);
    }

    // Filter by Police Station
    if (policeStation) {
      whereClauses.push(`PoliceStationID = '${policeStation}'`);
    }

    // Filter by District
    if (district && !policeStation) {
      const stations = await this.executeZCQL(`SELECT ROWID FROM Unit WHERE DistrictID = '${district}'`);
      if (stations.length > 0) {
        const stationRowIds = stations.map(s => `'${s.ROWID}'`).join(',');
        whereClauses.push(`PoliceStationID IN (${stationRowIds})`);
      } else {
        whereClauses.push("PoliceStationID = '0'");
      }
    }

    // Filter by Year
    if (year) {
      whereClauses.push(`CrimeRegisteredDate >= '${year}-01-01'`);
      whereClauses.push(`CrimeRegisteredDate <= '${year}-12-31'`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const baseQuery = `SELECT CrimeRegisteredDate, CrimeMajorHeadID, CrimeMinorHeadID, PoliceStationID, latitude, longitude FROM CaseMaster ${whereString}`;

    // Execute paginated fetch to retrieve all matching cases
    const cases = await this.executePaginatedZCQL(baseQuery);

    if (cases.length === 0) {
      return {
        totalRecords: 0,
        summary: {
          highestGrowthDistrict: 'N/A',
          highestGrowthStation: 'N/A',
          fastestGrowingCrimeType: 'N/A',
          largestCrimeIncrease: 'N/A',
          avgGrowth: 0,
          clusterCount: 0
        },
        rankings: {
          districts: [],
          stations: [],
          locations: [],
          crimeCategories: [],
          crimeTypes: []
        },
        insights: ['Not enough historical data to detect crime clusters.']
      };
    }

    // Fetch metadata for name mapping
    const districts = await this.executeZCQL('SELECT ROWID, DistrictName FROM District');
    const stations = await this.executeZCQL('SELECT ROWID, UnitName, DistrictID FROM Unit');
    const crimeHeads = await this.executeZCQL('SELECT ROWID, CrimeGroupName FROM CrimeHead');
    const crimeSubHeads = await this.executeZCQL('SELECT ROWID, CrimeHeadName FROM CrimeSubHead');

    // Create lookup maps
    const districtMap = {};
    districts.forEach(d => { districtMap[d.ROWID] = d.DistrictName; });

    const unitMap = {};
    stations.forEach(s => { unitMap[s.ROWID] = { UnitName: s.UnitName, DistrictID: s.DistrictID }; });

    const crimeHeadMap = {};
    crimeHeads.forEach(ch => { crimeHeadMap[ch.ROWID] = ch.CrimeGroupName; });

    const crimeSubHeadMap = {};
    crimeSubHeads.forEach(csh => { crimeSubHeadMap[csh.ROWID] = csh.CrimeHeadName; });

    // Filter in-memory by Month (if specified)
    let filteredCases = cases;
    if (month) {
      const monthStr = month.toString().padStart(2, '0');
      filteredCases = cases.filter(c => {
        if (!c.CrimeRegisteredDate) return false;
        const parts = c.CrimeRegisteredDate.split('-');
        return parts[1] === monthStr;
      });
    }

    if (filteredCases.length === 0) {
      return {
        totalRecords: 0,
        summary: {
          highestGrowthDistrict: 'N/A',
          highestGrowthStation: 'N/A',
          fastestGrowingCrimeType: 'N/A',
          largestCrimeIncrease: 'N/A',
          avgGrowth: 0,
          clusterCount: 0
        },
        rankings: {
          districts: [],
          stations: [],
          locations: [],
          crimeCategories: [],
          crimeTypes: []
        },
        insights: ['Not enough historical data to detect crime clusters.']
      };
    }

    // Identify anchor maximum date
    const dates = filteredCases
      .map(c => c.CrimeRegisteredDate)
      .filter(Boolean)
      .sort((a, b) => new Date(a) - new Date(b));
    
    if (dates.length === 0) {
      return {
        totalRecords: 0,
        summary: {
          highestGrowthDistrict: 'N/A',
          highestGrowthStation: 'N/A',
          fastestGrowingCrimeType: 'N/A',
          largestCrimeIncrease: 'N/A',
          avgGrowth: 0,
          clusterCount: 0
        },
        rankings: {
          districts: [],
          stations: [],
          locations: [],
          crimeCategories: [],
          crimeTypes: []
        },
        insights: ['Not enough historical data to detect crime clusters.']
      };
    }

    const maxDateStr = dates[dates.length - 1];

    // Split cases into Current and Previous period bins
    const currentPeriodCases = [];
    const previousPeriodCases = [];

    filteredCases.forEach(c => {
      if (!c.CrimeRegisteredDate) return;
      const period = this.getCasePeriod(c.CrimeRegisteredDate, maxDateStr, interval);
      if (period === 'current') {
        currentPeriodCases.push(c);
      } else if (period === 'previous') {
        previousPeriodCases.push(c);
      }
    });

    // Check if we have cases in at least one period
    if (currentPeriodCases.length === 0 && previousPeriodCases.length === 0) {
      return {
        totalRecords: 0,
        summary: {
          highestGrowthDistrict: 'N/A',
          highestGrowthStation: 'N/A',
          fastestGrowingCrimeType: 'N/A',
          largestCrimeIncrease: 'N/A',
          avgGrowth: 0,
          clusterCount: 0
        },
        rankings: {
          districts: [],
          stations: [],
          locations: [],
          crimeCategories: [],
          crimeTypes: []
        },
        insights: ['Not enough historical data to detect crime clusters.']
      };
    }

    // Aggregate values
    const compileAgg = (casesList) => {
      const dist = {};
      const stat = {};
      const loc = {};
      const cat = {};
      const typ = {};

      casesList.forEach(c => {
        const stationInfo = unitMap[c.PoliceStationID] || { UnitName: 'Unknown Station', DistrictID: null };
        const districtName = districtMap[stationInfo.DistrictID] || 'Unknown District';
        const stationName = stationInfo.UnitName;
        const categoryName = crimeHeadMap[c.CrimeMajorHeadID] || 'Unknown Category';
        const typeName = crimeSubHeadMap[c.CrimeMinorHeadID] || 'Unknown Type';
        const lat = c.latitude ? parseFloat(c.latitude) : null;
        const lng = c.longitude ? parseFloat(c.longitude) : null;

        dist[districtName] = (dist[districtName] || 0) + 1;
        stat[stationName] = (stat[stationName] || 0) + 1;
        cat[categoryName] = (cat[categoryName] || 0) + 1;
        typ[typeName] = (typ[typeName] || 0) + 1;

        if (lat !== null && lng !== null) {
          const locKey = `${lat},${lng}|${stationName}|${districtName}`;
          loc[locKey] = (loc[locKey] || 0) + 1;
        }
      });

      return { dist, stat, loc, cat, typ };
    };

    const currentAgg = compileAgg(currentPeriodCases);
    const previousAgg = compileAgg(previousPeriodCases);

    const RISK_THRESHOLDS = {
      CRITICAL: 100, // 100% or more
      HIGH: 50,      // 50% or more
      MEDIUM: 20,    // 20% or more
      LOW: 0
    };

    const computeRankingList = (currMap, prevMap, isLocation = false) => {
      const allKeys = new Set([...Object.keys(currMap), ...Object.keys(prevMap)]);
      const resultList = [];

      allKeys.forEach(key => {
        const currCount = currMap[key] || 0;
        const prevCount = prevMap[key] || 0;
        const diff = currCount - prevCount;
        
        let pct = 0;
        if (prevCount === 0) {
          pct = currCount > 0 ? currCount * 100 : 0;
        } else {
          pct = Math.round((diff / prevCount) * 100);
        }

        let risk = 'LOW';
        if (pct >= RISK_THRESHOLDS.CRITICAL) risk = 'CRITICAL';
        else if (pct >= RISK_THRESHOLDS.HIGH) risk = 'HIGH';
        else if (pct >= RISK_THRESHOLDS.MEDIUM) risk = 'MEDIUM';

        const trend = diff > 0 ? 'Increasing' : diff < 0 ? 'Decreasing' : 'Stable';

        let name = key;
        let lat = null;
        let lng = null;

        if (isLocation) {
          const parts = key.split('|');
          const coords = parts[0].split(',');
          lat = parseFloat(coords[0]);
          lng = parseFloat(coords[1]);
          name = `Lat: ${lat}, Lng: ${lng} (${parts[1]})`;
        }

        resultList.push({
          name,
          currentCount: currCount,
          previousCount: prevCount,
          difference: diff,
          percentage: pct,
          risk,
          trend,
          ...(isLocation ? { lat, lng } : {})
        });
      });

      // Sort by growth percentage (descending)
      resultList.sort((a, b) => b.percentage - a.percentage);

      return resultList.map((item, idx) => ({
        rank: idx + 1,
        ...item
      }));
    };

    const rankedDistricts = computeRankingList(currentAgg.dist, previousAgg.dist);
    const rankedStations = computeRankingList(currentAgg.stat, previousAgg.stat);
    const rankedLocations = computeRankingList(currentAgg.loc, previousAgg.loc, true);
    const rankedCategories = computeRankingList(currentAgg.cat, previousAgg.cat);
    const rankedTypes = computeRankingList(currentAgg.typ, previousAgg.typ);

    // Summary Card stats calculations
    const getHighestGrowthName = (list) => {
      const increasing = list.filter(item => item.difference > 0);
      return increasing.length > 0 ? increasing[0].name : 'N/A';
    };

    const highestGrowthDistrict = getHighestGrowthName(rankedDistricts);
    const highestGrowthStation = getHighestGrowthName(rankedStations);
    const fastestGrowingCrimeType = getHighestGrowthName(rankedTypes);

    // Find largest absolute case increase
    let largestIncreaseName = 'N/A';
    let maxIncreaseDiff = 0;
    
    rankedStations.forEach(s => {
      if (s.difference > maxIncreaseDiff) {
        maxIncreaseDiff = s.difference;
        largestIncreaseName = `${s.name} (+${s.difference} cases)`;
      }
    });

    // Detect active clusters (growth >= 20% or high count >= 5 cases in current period)
    const activeClusters = rankedStations.filter(s => s.percentage >= 20 || s.currentCount >= 5);
    const clusterCount = activeClusters.length;
    
    const totalGrowthSum = activeClusters.reduce((acc, c) => acc + c.percentage, 0);
    const avgGrowth = clusterCount > 0 ? Math.round(totalGrowthSum / clusterCount) : 0;

    // Dynamic insights sentence builder
    const insights = [];
    
    // Insight 1: Highest growth district
    const topGrowDist = rankedDistricts.find(d => d.difference > 0);
    if (topGrowDist) {
      insights.push(`Crime cases increased by ${topGrowDist.percentage}% in ${topGrowDist.name} compared to the previous period.`);
    }

    // Insight 2: Highest growth station
    const topGrowStation = rankedStations.find(s => s.difference > 0);
    if (topGrowStation) {
      insights.push(`Abnormal activity detected in ${topGrowStation.name} Police Station, with a growth of ${topGrowStation.percentage}%.`);
    }

    // Insight 3: Specific crime type surge
    const topGrowType = rankedTypes.find(t => t.difference > 0);
    if (topGrowType) {
      insights.push(`${topGrowType.name} cases registered a growth of ${topGrowType.percentage}% across the selected region.`);
    }

    if (insights.length === 0) {
      insights.push('No significant crime escalation or abnormal growth detected in the current period.');
    }

    return {
      totalRecords: filteredCases.length,
      summary: {
        highestGrowthDistrict,
        highestGrowthStation,
        fastestGrowingCrimeType,
        largestCrimeIncrease: largestIncreaseName,
        avgGrowth,
        clusterCount
      },
      rankings: {
        districts: rankedDistricts,
        stations: rankedStations,
        locations: rankedLocations,
        crimeCategories: rankedCategories,
        crimeTypes: rankedTypes
      },
      insights
    };
  }

  /**
   * Helper to resolve period classification of cases relative to dataset maxDate
   */
  getCasePeriod(caseDateStr, maxDateStr, interval) {
    const cDate = new Date(caseDateStr);
    const maxDate = new Date(maxDateStr);

    const cYear = cDate.getFullYear();
    const cMonth = cDate.getMonth();
    
    const maxYear = maxDate.getFullYear();
    const maxMonth = maxDate.getMonth();

    if (interval === 'year') {
      if (cYear === maxYear) return 'current';
      if (cYear === maxYear - 1) return 'previous';
      return 'other';
    }

    if (interval === 'month') {
      if (cYear === maxYear && cMonth === maxMonth) return 'current';
      
      let prevYear = maxYear;
      let prevMonth = maxMonth - 1;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear--;
      }
      if (cYear === prevYear && cMonth === prevMonth) return 'previous';
      return 'other';
    }

    if (interval === 'quarter') {
      const getQuarter = (m) => Math.floor(m / 3);
      const maxQ = getQuarter(maxMonth);
      const cQ = getQuarter(cMonth);

      if (cYear === maxYear && cQ === maxQ) return 'current';
      
      let prevYear = maxYear;
      let prevQ = maxQ - 1;
      if (prevQ < 0) {
        prevQ = 3;
        prevYear--;
      }
      if (cYear === prevYear && cQ === prevQ) return 'previous';
      return 'other';
    }

    if (interval === 'week') {
      const oneDay = 24 * 60 * 60 * 1000;
      const diffDays = Math.floor((maxDate.getTime() - cDate.getTime()) / oneDay);
      if (diffDays >= 0 && diffDays < 7) return 'current';
      if (diffDays >= 7 && diffDays < 14) return 'previous';
      return 'other';
    }

    return 'other';
  }

  /**
   * Computes Seasonal Analysis distributions, heatmaps, summary metrics, and insights
   */
  async getSeasonalData(filters) {
    const { startDate, endDate, crimeCategory, crimeType, district, policeStation, year, month, season } = filters;
    const whereClauses = [];

    // Filter by Date Range
    if (startDate) {
      whereClauses.push(`CrimeRegisteredDate >= '${startDate}'`);
    }
    if (endDate) {
      whereClauses.push(`CrimeRegisteredDate <= '${endDate}'`);
    }

    // Filter by Crime Category (CrimeMajorHeadID)
    if (crimeCategory) {
      whereClauses.push(`CrimeMajorHeadID = '${crimeCategory}'`);
    }

    // Filter by Crime Type (CrimeMinorHeadID)
    if (crimeType) {
      whereClauses.push(`CrimeMinorHeadID = '${crimeType}'`);
    }

    // Filter by Police Station
    if (policeStation) {
      whereClauses.push(`PoliceStationID = '${policeStation}'`);
    }

    // Filter by District
    if (district && !policeStation) {
      const stations = await this.executeZCQL(`SELECT ROWID FROM Unit WHERE DistrictID = '${district}'`);
      if (stations.length > 0) {
        const stationRowIds = stations.map(s => `'${s.ROWID}'`).join(',');
        whereClauses.push(`PoliceStationID IN (${stationRowIds})`);
      } else {
        whereClauses.push("PoliceStationID = '0'");
      }
    }

    // Filter by Year
    if (year) {
      whereClauses.push(`CrimeRegisteredDate >= '${year}-01-01'`);
      whereClauses.push(`CrimeRegisteredDate <= '${year}-12-31'`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const baseQuery = `SELECT CrimeRegisteredDate, CrimeMajorHeadID, CrimeMinorHeadID, PoliceStationID, latitude, longitude FROM CaseMaster ${whereString}`;

    // Execute paginated fetch
    const cases = await this.executePaginatedZCQL(baseQuery);

    // Fetch metadata for name mapping
    const districts = await this.executeZCQL('SELECT ROWID, DistrictName FROM District');
    const stations = await this.executeZCQL('SELECT ROWID, UnitName, DistrictID FROM Unit');
    const crimeHeads = await this.executeZCQL('SELECT ROWID, CrimeGroupName FROM CrimeHead');
    const crimeSubHeads = await this.executeZCQL('SELECT ROWID, CrimeHeadName FROM CrimeSubHead');

    // Create lookup maps
    const districtMap = {};
    districts.forEach(d => { districtMap[d.ROWID] = d.DistrictName; });

    const unitMap = {};
    stations.forEach(s => { unitMap[s.ROWID] = { UnitName: s.UnitName, DistrictID: s.DistrictID }; });

    const crimeHeadMap = {};
    crimeHeads.forEach(ch => { crimeHeadMap[ch.ROWID] = ch.CrimeGroupName; });

    const crimeSubHeadMap = {};
    crimeSubHeads.forEach(csh => { crimeSubHeadMap[csh.ROWID] = csh.CrimeHeadName; });

    // Filter in-memory by Month & Season
    let filteredCases = cases;
    if (month) {
      const monthStr = month.toString().padStart(2, '0');
      filteredCases = filteredCases.filter(c => {
        if (!c.CrimeRegisteredDate) return false;
        const parts = c.CrimeRegisteredDate.split('-');
        return parts[1] === monthStr;
      });
    }

    if (season) {
      filteredCases = filteredCases.filter(c => {
        if (!c.CrimeRegisteredDate) return false;
        const parts = c.CrimeRegisteredDate.split('-');
        const monthNum = parseInt(parts[1], 10);
        const caseSeason = seasonConfig.getSeason(monthNum);
        return caseSeason.toLowerCase() === season.toLowerCase();
      });
    }

    const totalRecords = filteredCases.length;

    if (totalRecords === 0) {
      return {
        totalRecords: 0,
        eventCalendarConfigured: false,
        summary: {
          highestCrimeSeason: 'N/A',
          lowestCrimeSeason: 'N/A',
          highestCrimeMonth: 'N/A',
          highestCrimeWeekday: 'N/A',
          highestCrimeWeekendCount: 0,
          mostCommonSeasonalCrimeType: 'N/A'
        },
        distributions: {
          monthly: [],
          quarterly: [],
          seasonal: [],
          weekdayWeekend: [],
          dayOfWeek: [],
          yearWiseSeasonal: [],
          crimeTypeSeason: [],
          districtSeason: [],
          stationSeason: []
        },
        heatmaps: {
          monthlyHeatmap: [],
          calendarHeatmap: []
        },
        insights: []
      };
    }

    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Initialize aggregators
    const monthlyMap = Array(12).fill(0);
    const quarterMap = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const seasonMap = {};
    seasonConfig.getAvailableSeasons().forEach(s => { seasonMap[s] = 0; });

    let weekdayCount = 0;
    let weekendCount = 0;
    const dayOfWeekMap = Array(7).fill(0);
    const yearWiseSeasonalMap = {};
    const crimeCategorySeasonMap = {};
    const districtSeasonMap = {};
    const stationSeasonMap = {};
    const monthlyHeatmapMap = {};
    const calendarHeatmapMap = {};

    filteredCases.forEach(c => {
      if (!c.CrimeRegisteredDate) return;
      
      const dateParts = c.CrimeRegisteredDate.split('-');
      const yearStr = dateParts[0];
      const monthNum = parseInt(dateParts[1], 10);
      const monthIndex = monthNum - 1;
      
      // Construct date as local to prevent timezone shifting
      const localDate = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
      const dayIndex = localDate.getDay();

      const monthName = MONTH_NAMES[monthIndex];
      const dayName = DAY_NAMES[dayIndex];
      const seasonName = seasonConfig.getSeason(monthNum);
      const isWeekend = (dayIndex === 0 || dayIndex === 6);

      const stationInfo = unitMap[c.PoliceStationID] || { UnitName: 'Unknown Station', DistrictID: null };
      const districtName = districtMap[stationInfo.DistrictID] || 'Unknown District';
      const stationName = stationInfo.UnitName;
      const categoryName = crimeHeadMap[c.CrimeMajorHeadID] || 'Unknown Category';

      monthlyMap[monthIndex]++;
      
      const quarter = `Q${Math.floor(monthIndex / 3) + 1}`;
      quarterMap[quarter]++;

      if (seasonName in seasonMap) {
        seasonMap[seasonName]++;
      } else {
        seasonMap[seasonName] = 1;
      }

      if (isWeekend) {
        weekendCount++;
      } else {
        weekdayCount++;
      }

      dayOfWeekMap[dayIndex]++;

      if (!yearWiseSeasonalMap[yearStr]) {
        yearWiseSeasonalMap[yearStr] = {};
        seasonConfig.getAvailableSeasons().forEach(s => { yearWiseSeasonalMap[yearStr][s] = 0; });
      }
      yearWiseSeasonalMap[yearStr][seasonName] = (yearWiseSeasonalMap[yearStr][seasonName] || 0) + 1;

      if (!crimeCategorySeasonMap[categoryName]) {
        crimeCategorySeasonMap[categoryName] = {};
        seasonConfig.getAvailableSeasons().forEach(s => { crimeCategorySeasonMap[categoryName][s] = 0; });
      }
      crimeCategorySeasonMap[categoryName][seasonName] = (crimeCategorySeasonMap[categoryName][seasonName] || 0) + 1;

      if (!districtSeasonMap[districtName]) {
        districtSeasonMap[districtName] = {};
        seasonConfig.getAvailableSeasons().forEach(s => { districtSeasonMap[districtName][s] = 0; });
      }
      districtSeasonMap[districtName][seasonName] = (districtSeasonMap[districtName][seasonName] || 0) + 1;

      if (!stationSeasonMap[stationName]) {
        stationSeasonMap[stationName] = {};
        seasonConfig.getAvailableSeasons().forEach(s => { stationSeasonMap[stationName][s] = 0; });
      }
      stationSeasonMap[stationName][seasonName] = (stationSeasonMap[stationName][seasonName] || 0) + 1;

      if (!monthlyHeatmapMap[monthNum]) {
        monthlyHeatmapMap[monthNum] = {};
      }
      monthlyHeatmapMap[monthNum][categoryName] = (monthlyHeatmapMap[monthNum][categoryName] || 0) + 1;

      if (!calendarHeatmapMap[monthNum]) {
        calendarHeatmapMap[monthNum] = {};
      }
      calendarHeatmapMap[monthNum][dayName] = (calendarHeatmapMap[monthNum][dayName] || 0) + 1;
    });

    // Formatting distributions
    const monthlyList = MONTH_NAMES.map((name, i) => ({ month: name, count: monthlyMap[i] }));
    const quarterlyList = Object.entries(quarterMap).map(([quarter, count]) => ({ quarter, count }));
    const seasonalList = Object.entries(seasonMap).map(([season, count]) => ({ season, count }));
    const weekdayWeekendList = [
      { type: 'Weekday', count: weekdayCount },
      { type: 'Weekend', count: weekendCount }
    ];
    const dayOfWeekList = DAY_NAMES.map((name, i) => ({ day: name, count: dayOfWeekMap[i] }));

    const yearWiseSeasonalList = Object.entries(yearWiseSeasonalMap).map(([year, seasons]) => ({
      year,
      ...seasons
    })).sort((a, b) => a.year.localeCompare(b.year));

    const crimeTypeSeasonList = Object.entries(crimeCategorySeasonMap).map(([crimeCategory, seasons]) => ({
      crimeCategory,
      ...seasons
    }));

    const districtSeasonList = Object.entries(districtSeasonMap).map(([district, seasons]) => ({
      district,
      ...seasons
    }));

    const stationSeasonList = Object.entries(stationSeasonMap).map(([station, seasons]) => ({
      station,
      ...seasons
    }));

    // Flat heatmaps formatting
    const categoriesList = [...new Set(Object.values(crimeHeadMap))];
    const monthlyHeatmapList = [];
    for (let m = 1; m <= 12; m++) {
      const monthName = MONTH_NAMES[m - 1];
      categoriesList.forEach(cat => {
        const count = (monthlyHeatmapMap[m] && monthlyHeatmapMap[m][cat]) || 0;
        monthlyHeatmapList.push({ month: monthName, category: cat, count });
      });
    }

    const calendarHeatmapList = [];
    for (let m = 1; m <= 12; m++) {
      const monthName = MONTH_NAMES[m - 1];
      DAY_NAMES.forEach(day => {
        const count = (calendarHeatmapMap[m] && calendarHeatmapMap[m][day]) || 0;
        calendarHeatmapList.push({ month: monthName, day, count });
      });
    }

    // Calculating summary cards metrics
    let highestCrimeSeason = 'N/A';
    let highestSeasonCount = -1;
    let lowestCrimeSeason = 'N/A';
    let lowestSeasonCount = Infinity;
    Object.entries(seasonMap).forEach(([s, count]) => {
      if (count > highestSeasonCount) {
        highestSeasonCount = count;
        highestCrimeSeason = s;
      }
      if (count < lowestSeasonCount) {
        lowestSeasonCount = count;
        lowestCrimeSeason = s;
      }
    });

    let highestCrimeMonth = 'N/A';
    let highestMonthCount = -1;
    monthlyList.forEach(m => {
      if (m.count > highestMonthCount) {
        highestMonthCount = m.count;
        highestCrimeMonth = m.month;
      }
    });

    let highestCrimeWeekday = 'N/A';
    let highestWeekdayCount = -1;
    const weekdayIndices = [1, 2, 3, 4, 5];
    weekdayIndices.forEach(idx => {
      const count = dayOfWeekMap[idx];
      if (count > highestWeekdayCount) {
        highestWeekdayCount = count;
        highestCrimeWeekday = DAY_NAMES[idx];
      }
    });

    let mostCommonSeasonalCrimeType = 'N/A';
    let peakSeasonalCrimeCount = -1;
    if (highestCrimeSeason !== 'N/A') {
      Object.entries(crimeCategorySeasonMap).forEach(([cat, seasons]) => {
        const count = seasons[highestCrimeSeason] || 0;
        if (count > peakSeasonalCrimeCount) {
          peakSeasonalCrimeCount = count;
          mostCommonSeasonalCrimeType = cat;
        }
      });
    }

    // Dynamic insights sentence builder
    const insights = [];
    const peakSeasonPct = Math.round((highestSeasonCount / totalRecords) * 100);
    insights.push(`Crime activity peaks during the ${highestCrimeSeason} season, accounting for ${peakSeasonPct}% of all registered cases.`);

    const weekendPct = Math.round((weekendCount / totalRecords) * 100);
    if (weekendPct > 35) {
      insights.push(`A significant proportion of crimes (${weekendPct}%) are registered on weekends, indicating heightened activity on Saturdays and Sundays.`);
    } else {
      insights.push(`Crimes show a stable distribution with ${weekendPct}% registered on weekends and ${100 - weekendPct}% on weekdays.`);
    }

    Object.entries(crimeCategorySeasonMap).forEach(([cat, seasons]) => {
      const catTotal = Object.values(seasons).reduce((a, b) => a + b, 0);
      if (catTotal >= 5) {
        for (const [season, count] of Object.entries(seasons)) {
          const pct = Math.round((count / catTotal) * 100);
          if (pct >= 40) {
            insights.push(`${cat} offences show a strong seasonal concentration, with ${pct}% of cases occurring during the ${season} season.`);
          }
        }
      }
    });

    return {
      totalRecords,
      eventCalendarConfigured: false,
      summary: {
        highestCrimeSeason,
        lowestCrimeSeason,
        highestCrimeMonth,
        highestCrimeWeekday,
        highestCrimeWeekendCount: weekendCount,
        mostCommonSeasonalCrimeType
      },
      distributions: {
        monthly: monthlyList,
        quarterly: quarterlyList,
        seasonal: seasonalList,
        weekdayWeekend: weekdayWeekendList,
        dayOfWeek: dayOfWeekList,
        yearWiseSeasonal: yearWiseSeasonalList,
        crimeTypeSeason: crimeTypeSeasonList,
        districtSeason: districtSeasonList,
        stationSeason: stationSeasonList
      },
      heatmaps: {
        monthlyHeatmap: monthlyHeatmapList,
        calendarHeatmap: calendarHeatmapList
      },
      insights
    };
  }
}

module.exports = AnalyticsService;
