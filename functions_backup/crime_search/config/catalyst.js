/**
 * Catalyst SDK Initialization Configuration
 * Standardizes access to Zoho Catalyst components like Data Store and ZCQL.
 */

const catalyst = require('zcatalyst-sdk-node');

/**
 * Initializes and returns a Zoho Catalyst Application instance.
 * Automatically handles whether a standard request object or a mock is provided.
 * 
 * @param {object} req - Raw HTTP request object from the serverless execution context
 * @returns {object} Initialized Catalyst application instance
 */
function getCatalystApp(req) {
  if (!req) {
    throw new Error('Catalyst SDK initialization requires the request object context.');
  }
  return catalyst.initialize(req);
}

module.exports = {
  getCatalystApp
};
