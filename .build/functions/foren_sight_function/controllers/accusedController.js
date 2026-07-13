/**
 * Accused/Criminal Controller Layer.
 * Receives incoming request queries, invokes the service layer, and sends standardized responses.
 */

const AccusedService = require('../services/accusedService');
const ResponseUtil = require('../shared/utils/response');

class AccusedController {
  /**
   * @param {object} catalystApp - Initialized Zoho Catalyst Application instance
   */
  constructor(catalystApp) {
    this.accusedService = new AccusedService(catalystApp);
  }

  /**
   * HTTP handler for GET /criminal endpoint.
   * 
   * @param {object} req - Standard HTTP request object
   * @param {object} res - Standard HTTP response object
   * @param {Logger} logger - Bound request logger instance
   */
  async handleSearchCriminal(req, res, logger) {
    console.log("=== CONTROLLER LAYER ===");
    console.log("Received Query:", JSON.stringify(req.query));
    logger.info('Search criminal profile request received', { query: req.query });

    const start = Date.now();
    const criminalDTO = await this.accusedService.searchCriminal(req.query);
    const executionTime = Date.now() - start;

    logger.info('Search criminal profile query completed successfully', {
      executionTimeMs: executionTime,
      accusedName: criminalDTO.accusedName
    });

    const payload = ResponseUtil.success(criminalDTO, 'Criminal profile retrieved successfully.');
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }
}

module.exports = AccusedController;
