const CaseRepository = require('../repositories/case.repository');

class CaseService {
  constructor(zcql) {
    this.repository = new CaseRepository(zcql);
  }

  /**
   * Look up case details by ID or crime number
   */
  async getCaseDetails(searchParams) {
    const { caseID, crimeNumber, firNumber, date, keyword } = searchParams;
    
    if (!caseID && !crimeNumber && !firNumber && !date && !keyword) {
      const error = new Error('Please provide caseID, crimeNumber, firNumber, date, or keyword');
      error.statusCode = 400;
      throw error;
    }

    const caseData = await this.repository.findCase(searchParams);

    if (!caseData) {
      const error = new Error('Case not found');
      error.statusCode = 404;
      throw error;
    }

    return caseData;
  }
}

module.exports = CaseService;
