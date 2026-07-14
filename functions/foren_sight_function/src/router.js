'use strict';

const { sendError } = require('./utils/response');
const healthHandler = require('./routes/health.route');
const officerHandler = require('./routes/officer.route');
const caseHandler = require('./routes/case.route');
const accusedHandler = require('./routes/accused.route');
const victimHandler = require('./routes/victim.route');
const investigatingOfficerHandler = require('./routes/investigatingOfficer.route');
const unitHandler = require('./routes/unit.route');
const courtHandler = require('./routes/court.route');

const routes = {
  'GET /health': healthHandler,
  'GET /officer': officerHandler,
  'GET /case': caseHandler,
  'GET /accused': accusedHandler,
  'GET /victim': victimHandler,
  'GET /investigating-officer': investigatingOfficerHandler,
  'GET /unit': unitHandler,
  'GET /court': courtHandler
};

function dispatch(req, res) {
  console.log('METHOD:', req.method, 'URL:', JSON.stringify(req.url));
  const parsedUrl = req.url.split('?')[0];
  const key = `${req.method} ${parsedUrl}`;
  const handler = routes[key];

  if (handler) {
    handler(req, res);
  } else {
    sendError(res, 404, 'Route not found');
  }
}

module.exports = { dispatch };