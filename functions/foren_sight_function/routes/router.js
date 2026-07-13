/**
 * Custom Lightweight Router (No Express).
 * Maps incoming HTTP routes directly to target Controllers and captures exceptions.
 */

const url = require('url');
const CrimeController = require('../controllers/crimeController');
const AccusedController = require('../controllers/accusedController');
const VictimController = require('../controllers/victimController');
const OfficerController = require('../controllers/officerController');
const handleError = require('../middleware/errorHandler');
const { NotFoundError } = require('../shared/middleware/errorSystem');

/**
 * Custom HTTP request dispatcher.
 * Parses the URL query and routes execution to corresponding controller.
 * 
 * @param {object} req - Catalyst HTTP request object
 * @param {object} res - Catalyst HTTP response object
 * @param {object} catalystApp - Initialized SDK App instance
 * @param {Logger} logger - Bound Request Logger
 */
async function routeDispatcher(req, res, catalystApp, logger) {
  try {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method ? req.method.toUpperCase() : 'GET';

    // Map query and body parsed objects to request context
    req.query = parsedUrl.query || {};

    console.log("=== ROUTER LAYER ===");
    console.log("Method:", method, "Path:", path);
    console.log("Query Params:", JSON.stringify(req.query));

    logger.debug('Route matching initialized', { method, path });

    // Routing Map Lookup
    if (path === '/fir' && method === 'GET') {
      const crimeController = new CrimeController(catalystApp);
      await crimeController.handleSearchFIR(req, res, logger);
    } else if (path === '/criminal' && method === 'GET') {
      const accusedController = new AccusedController(catalystApp);
      await accusedController.handleSearchCriminal(req, res, logger);
    } else if (path === '/victim' && method === 'GET') {
      const victimController = new VictimController(catalystApp);
      await victimController.handleSearchVictim(req, res, logger);
    } else if (path === '/officer' && method === 'GET') {
      const officerController = new OfficerController(catalystApp);
      await officerController.handleSearchOfficer(req, res, logger);
    } else {
      throw new NotFoundError(`The requested endpoint '${method} ${path}' does not exist.`);
    }
  } catch (error) {
    // Pipeline error handler catch
    handleError(error, req, res, logger);
  }
}

module.exports = routeDispatcher;
