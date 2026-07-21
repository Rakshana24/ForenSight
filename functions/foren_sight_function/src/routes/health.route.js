'use strict';

const { sendJSON, sendError } = require('../utils/response');
const { verifyLLMConnection } = require('../utils/llm');
const catalyst = require('zcatalyst-sdk-node');

async function healthHandler(req, res) {
  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    
    const results = {};
    try {
      const tableDetails = await app.datastore().getTableDetails('53343000000035369');
      results['table_35369'] = tableDetails;
    } catch(e) {
      results['table_35369_error'] = e.message;
    }
    try {
      // Also get Accused to see its columns
      const accusedDetails = await app.datastore().getTableDetails('Accused');
      results['AccusedDetails'] = accusedDetails;
    } catch(e) {
      results['AccusedDetailsError'] = e.message;
    }
    
    sendJSON(res, 200, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      samples: results
    });
  } catch (error) {
    console.error('Health check failed:', error);
    sendError(res, 500, error.message);
  }
}

module.exports = healthHandler;