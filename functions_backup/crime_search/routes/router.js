/**
 * Custom Lightweight Router (No Express).
 * Maps incoming HTTP routes directly to target Controllers and captures exceptions.
 */

const url = require('url');
const CrimeController = require('../controllers/crimeController');
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

    logger.debug('Route matching initialized', { method, path });

    const crimeController = new CrimeController(catalystApp);

    // Routing Map Lookup
    if (path === '/fir' && method === 'GET') {
      await crimeController.handleSearchFIR(req, res, logger);
    } else {
      throw new NotFoundError(`The requested endpoint '${method} ${path}' does not exist.`);
    }
  } catch (error) {
    // Pipeline error handler catch
    handleError(error, req, res, logger);
  }
}

module.exports = routeDispatcher;
