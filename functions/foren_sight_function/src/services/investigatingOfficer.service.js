const InvestigatingOfficerRepository = require('../repositories/investigatingOfficer.repository');

class InvestigatingOfficerService {
  constructor(zcql) {
    this.repository = new InvestigatingOfficerRepository(zcql);
  }

  async getInvestigatingOfficerDetails(searchParams) {
    const { caseID, crimeNumber } = searchParams;
    
    if (!caseID && !crimeNumber) {
      const error = new Error('Please provide caseID or crimeNumber');
      error.statusCode = 400;
      throw error;
    }

    // Step 1: Find CaseMaster record to get PolicePersonID
    const caseRecord = await this.repository.findCase(searchParams);

    if (!caseRecord) {
      const error = new Error('Case not found');
      error.statusCode = 404;
      throw error;
    }

    if (!caseRecord.PolicePersonID) {
      const error = new Error('Investigating officer not found for this case');
      error.statusCode = 404;
      throw error;
    }

    // Step 2: Find Employee details using PolicePersonID
    const officerData = await this.repository.findEmployee(caseRecord.PolicePersonID);

    if (!officerData) {
      const error = new Error('Investigating officer not found');
      error.statusCode = 404;
      throw error;
    }

    return officerData;
  }
}

module.exports = InvestigatingOfficerService;
