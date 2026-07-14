'use strict';

const { sendJSON } = require('../utils/response');

function healthHandler(req, res) {
  sendJSON(res, 200, {
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}

module.exports = healthHandler;