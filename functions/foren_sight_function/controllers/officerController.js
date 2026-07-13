/**
 * Police Officer Controller Layer.
 * Receives incoming request queries, invokes the service layer, and sends standardized responses.
 */

const OfficerService = require('../services/officerService');
const ResponseUtil = require('../shared/utils/response');

class OfficerController {
  /**
   * @param {object} catalystApp - Initialized Zoho Catalyst Application instance
   */
  constructor(catalystApp) {
    this.officerService = new OfficerService(catalystApp);
  }

  /**
   * HTTP handler for GET /officer endpoint.
   * 
   * @param {object} req - Standard HTTP request object
   * @param {object} res - Standard HTTP response object
   * @param {Logger} logger - Bound request logger instance
   */
  async handleSearchOfficer(req, res, logger) {
    console.log("=== CONTROLLER LAYER ===");
    console.log("Received Query:", JSON.stringify(req.query));
    logger.info('Search officer profile request received', { query: req.query });

    const start = Date.now();
    const officerDTO = await this.officerService.searchOfficer(req.query);
    const executionTime = Date.now() - start;

    logger.info('Search officer profile query completed successfully', {
      executionTimeMs: executionTime,
      firstName: officerDTO.firstName
    });

    const payload = ResponseUtil.success(officerDTO, 'Police officer profile retrieved successfully.');
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }
}

module.exports = OfficerController;
