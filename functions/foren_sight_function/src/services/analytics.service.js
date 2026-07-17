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

    return {
      districts,
      stations,
      crimeTypes
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
    const cases = await this.executeZCQL(baseQuery);

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
        avgCrimes: 0 // Will be computed contextually in the frontend or default-filled
      }
    };
  }
}

module.exports = AnalyticsService;
