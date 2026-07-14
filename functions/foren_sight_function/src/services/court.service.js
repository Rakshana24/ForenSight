const CourtRepository = require('../repositories/court.repository');

class CourtService {
  constructor(zcql) {
    this.repository = new CourtRepository(zcql);
  }

  async getCourtDetails(searchParams) {
    const { courtID, courtName } = searchParams;
    
    if (!courtID && !courtName) {
      const error = new Error('Please provide courtID or courtName');
      error.statusCode = 400;
      throw error;
    }

    const courtData = await this.repository.findCourt(searchParams);

    if (!courtData || courtData.length === 0) {
      const error = new Error('Court not found');
      error.statusCode = 404;
      throw error;
    }

    return courtData;
  }
}

module.exports = CourtService;
