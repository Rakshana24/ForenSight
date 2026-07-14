const AccusedRepository = require('../repositories/accused.repository');

class AccusedService {
  constructor(zcql) {
    this.repository = new AccusedRepository(zcql);
  }

  async getAccusedDetails(searchParams) {
    const { accusedID, accusedName, caseID } = searchParams;
    
    if (!accusedID && !accusedName && !caseID) {
      const error = new Error('Please provide accusedID, accusedName or caseID');
      error.statusCode = 400;
      throw error;
    }

    const accusedData = await this.repository.findAccused(searchParams);

    if (!accusedData || accusedData.length === 0) {
      const error = new Error('Accused not found.');
      error.statusCode = 404;
      throw error;
    }

    return accusedData;
  }
}

module.exports = AccusedService;
