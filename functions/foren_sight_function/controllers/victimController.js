/**
 * Victim Controller Layer.
 * Receives incoming request queries, invokes the service layer, and sends standardized responses.
 */

const VictimService = require('../services/victimService');
const ResponseUtil = require('../shared/utils/response');

class VictimController {
  /**
   * @param {object} catalystApp - Initialized Zoho Catalyst Application instance
   */
  constructor(catalystApp) {
    this.victimService = new VictimService(catalystApp);
  }

  /**
   * HTTP handler for GET /victim endpoint.
   * 
   * @param {object} req - Standard HTTP request object
   * @param {object} res - Standard HTTP response object
   * @param {Logger} logger - Bound request logger instance
   */
  async handleSearchVictim(req, res, logger) {
    console.log("=== CONTROLLER LAYER ===");
    console.log("Received Query:", JSON.stringify(req.query));
    logger.info('Search victim profile request received', { query: req.query });

    const start = Date.now();
    const victimDTO = await this.victimService.searchVictim(req.query);
    const executionTime = Date.now() - start;

    logger.info('Search victim profile query completed successfully', {
      executionTimeMs: executionTime,
      victimName: victimDTO.victimName
    });

    const payload = ResponseUtil.success(victimDTO, 'Victim profile retrieved successfully.');
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }
}

module.exports = VictimController;
