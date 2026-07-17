'use strict';

const { sendJSON, sendError } = require('../utils/response');
const { verifyLLMConnection } = require('../utils/llm');
const catalyst = require('zcatalyst-sdk-node');

async function healthHandler(req, res) {
  try {
    const app = catalyst.initialize(req);
    const llmStatus = await verifyLLMConnection(app);
    sendJSON(res, 200, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      llm: {
        status: 'connected',
        message: llmStatus.message
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    // Check if it's a configuration error vs connection/auth error
    const statusCode = error.message.includes('Configuration Error') ? 500 : 502;
    sendError(res, statusCode, error.message);
  }
}

module.exports = healthHandler;