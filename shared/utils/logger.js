/**
 * Centralized Logging Utility for ForenSight Platform.
 * Supports request tracking, execution profiling, and integrates with Zoho Catalyst context logging.
 */

class Logger {
  /**
   * Creates a logger instance, optionally bound to a Catalyst request context.
   * 
   * @param {object} [context=null] - Catalyst execution context
   * @param {string} [requestId='N/A'] - Unique request correlation ID
   * @param {string} [functionName='foren_sight_function'] - Serverless function identifier
   */
  constructor(context = null, requestId = null, functionName = 'foren_sight_function') {
    this.context = context;
    this.requestId = requestId || (context && context.getProjectDetails ? context.getProjectDetails().requestId : null) || 'SYSTEM';
    this.functionName = functionName;
  }

  /**
   * Low-level log writer.
   * 
   * @param {string} level - Log level (INFO, WARN, ERROR, DEBUG)
   * @param {string} message - Description message
   * @param {object} [metadata={}] - Structured execution metrics (executionTime, queryTime, etc.)
   */
  writeLog(level, message, metadata = {}) {
    const logPayload = {
      timestamp: new Date().toISOString(),
      level,
      requestId: this.requestId,
      functionName: this.functionName,
      message,
      ...metadata
    };

    const logString = JSON.stringify(logPayload);

    // Attempt to write to Catalyst log stream if context exists
    if (this.context && this.context.log && typeof this.context.log.info === 'function') {
      switch (level) {
        case 'ERROR':
          this.context.log.error(logString);
          break;
        case 'WARN':
          this.context.log.warn(logString);
          break;
        default:
          this.context.log.info(logString);
          break;
      }
    } else {
      // Local development stdout / stderr fallback
      switch (level) {
        case 'ERROR':
          console.error(`[ERROR] ${logString}`);
          break;
        case 'WARN':
          console.warn(`[WARN] ${logString}`);
          break;
        default:
          console.log(`[INFO] ${logString}`);
          break;
      }
    }
  }

  info(message, metadata) {
    this.writeLog('INFO', message, metadata);
  }

  warn(message, metadata) {
    this.writeLog('WARN', message, metadata);
  }

  error(message, metadata) {
    this.writeLog('ERROR', message, metadata);
  }

  debug(message, metadata) {
    this.writeLog('DEBUG', message, metadata);
  }
}

module.exports = Logger;
