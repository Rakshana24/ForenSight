const VictimRepository = require('../repositories/victim.repository');

class VictimService {
  constructor(zcql) {
    this.repository = new VictimRepository(zcql);
  }

  async getVictimDetails(searchParams) {
    const { victimID, victimName, caseID } = searchParams;
    
    if (!victimID && !victimName && !caseID) {
      const error = new Error('Please provide victimID, victimName or caseID');
      error.statusCode = 400;
      throw error;
    }

    const victimData = await this.repository.findVictim(searchParams);

    if (!victimData || victimData.length === 0) {
      const error = new Error('Victim not found.');
      error.statusCode = 404;
      throw error;
    }

    return victimData;
  }
}

module.exports = VictimService;
