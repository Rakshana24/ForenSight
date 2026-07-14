const UnitRepository = require('../repositories/unit.repository');

class UnitService {
  constructor(zcql) {
    this.repository = new UnitRepository(zcql);
  }

  async getUnitDetails(searchParams) {
    const { unitID, unitName } = searchParams;
    
    if (!unitID && !unitName) {
      const error = new Error('Please provide unitID or unitName');
      error.statusCode = 400;
      throw error;
    }

    const unitData = await this.repository.findUnit(searchParams);

    if (!unitData || unitData.length === 0) {
      const error = new Error('Unit not found');
      error.statusCode = 404;
      throw error;
    }

    // Return the first match or all matches if unitName returns multiple?
    // User requested "Return the complete Unit record."
    // For exact match on unitID/unitName we will return an array or object.
    // If unitID is unique, returning the object is better, but returning array is consistent with Accused API.
    // Let's just return the first record for simplicity, or the array.
    // I'll return the first match since it represents "the Unit record".
    return unitData;
  }
}

module.exports = UnitService;
