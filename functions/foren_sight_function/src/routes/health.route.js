'use strict';

const { sendJSON, sendError } = require('../utils/response');
const { verifyGeminiConnection } = require('../utils/gemini');

async function healthHandler(req, res) {
  try {
    const geminiStatus = await verifyGeminiConnection();
    sendJSON(res, 200, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      gemini: {
        status: 'connected',
        message: geminiStatus.message
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