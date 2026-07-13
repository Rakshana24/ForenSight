/**
 * Crime Controller Layer.
 * Receives incoming request queries, invokes the service layer, and sends standardized responses.
 */

const CrimeService = require('../services/crimeService');
const ResponseUtil = require('../shared/utils/response');

class CrimeController {
  /**
   * @param {object} catalystApp - Initialized Zoho Catalyst Application instance
   */
  constructor(catalystApp) {
    this.crimeService = new CrimeService(catalystApp);
  }

  /**
   * HTTP handler for GET /fir endpoint.
   * 
   * @param {object} req - Standard HTTP request object
   * @param {object} res - Standard HTTP response object
   * @param {Logger} logger - Bound request logger instance
   */
  async handleSearchFIR(req, res, logger) {
    logger.info('Search FIR request received', { query: req.query });

    const start = Date.now();
    const firDTO = await this.crimeService.searchFIR(req.query);
    const executionTime = Date.now() - start;

    logger.info('Search FIR query completed successfully', {
      executionTimeMs: executionTime,
      caseMasterId: firDTO.caseMasterId
    });

    const payload = ResponseUtil.success(firDTO, 'FIR record retrieved successfully.');
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }
}

module.exports = CrimeController;
