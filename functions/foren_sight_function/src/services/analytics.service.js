'use strict';

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
}

module.exports = AnalyticsService;
