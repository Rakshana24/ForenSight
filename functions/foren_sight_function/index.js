/**
 * Advanced I/O Function entry point for Zoho Catalyst CloudScale.
 * Handles initial request wrapping, logger binding, and forwards execution to the router.
 */

const { getCatalystApp } = require('./config/catalyst');
const Logger = require('./shared/utils/logger');
const routeDispatcher = require('./routes/router');

/**
 * Main function handler exported for Catalyst serverless container.
 * 
 * @param {object} req - Zoho Catalyst request object
 * @param {object} res - Zoho Catalyst response object
 */
module.exports = async (req, res) => {
  const start = Date.now();
  
  // 1. Initialize Catalyst application scope
  let app;
  try {
    app = getCatalystApp(req);
  } catch (err) {
    // Fallback response if SDK initialization itself crashes
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      message: 'Failed to initialize Catalyst SDK.',
      error: { code: 'SDK_INITIALIZATION_ERROR', details: err.message },
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 2. Instantiate boundary request logger
  // Zoho Catalyst provides req.headers['x-request-id'] or similar for request correlation
  const requestId = req.headers ? req.headers['x-request-id'] || req.headers['x-catalyst-request-id'] : null;
  const logger = new Logger(null, requestId, 'foren_sight_function');

  // 3. Forward request to custom router
  try {
    await routeDispatcher(req, res, app, logger);
  } catch (uncaughtErr) {
    logger.error('Router execution crashed with uncaught handler error', {
      errorMessage: uncaughtErr.message,
      stack: uncaughtErr.stack
    });
    
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      message: 'A fatal execution error occurred inside the crime search container.',
      error: { code: 'UNCAUGHT_SYSTEM_CRASH', details: uncaughtErr.message },
      timestamp: new Date().toISOString()
    }));
  }
};
