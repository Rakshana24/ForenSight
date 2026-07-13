/**
 * Centralized HTTP Error Handler Middleware.
 * Catches all controller exceptions and formats them to standardized JSON payloads.
 */

const { AppError } = require('../shared/middleware/errorSystem');
const ResponseUtil = require('../shared/utils/response');

/**
 * Global exception handler function.
 * 
 * @param {Error} err - Captured error object
 * @param {object} req - HTTP request context
 * @param {object} res - HTTP response context
 * @param {Logger} logger - bound request logger instance
 */
function handleError(err, req, res, logger) {
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred on the security platform.';
  let details = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'CatalystError' || err.code === 'DB_ERROR') {
    // Platform database error abstraction
    statusCode = 500;
    errorCode = 'DATABASE_OPERATIONAL_FAILURE';
    message = 'Data Store execution failure. Access was rejected or query is invalid.';
    details = { originalMessage: err.message };
  } else {
    // Uncaptured standard exceptions
    details = { errorName: err.name, originalMessage: err.message };
  }

  logger.error('Request execution failed', {
    errorCode,
    statusCode,
    errorMessage: err.message,
    details,
    stack: err.stack
  });

  const payload = ResponseUtil.error(message, errorCode, details);

  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

module.exports = handleError;
