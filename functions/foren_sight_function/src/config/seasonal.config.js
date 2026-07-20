'use strict';

const seasonalConfig = {
  // Configurable mapping of months (1-12) to season names
  mappings: {
    1: 'Winter',
    2: 'Winter',
    3: 'Summer',
    4: 'Summer',
    5: 'Summer',
    6: 'Monsoon',
    7: 'Monsoon',
    8: 'Monsoon',
    9: 'Monsoon',
    10: 'Autumn',
    11: 'Autumn',
    12: 'Winter'
  },

  // Retrieve the season name for a given month number (1-12)
  getSeason(monthNumber) {
    const month = parseInt(monthNumber, 10);
    return this.mappings[month] || 'Unknown';
  },

  // Get a list of all unique seasons configured
  getAvailableSeasons() {
    return [...new Set(Object.values(this.mappings))];
  }
};

module.exports = seasonalConfig;
