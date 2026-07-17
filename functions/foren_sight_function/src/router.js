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
const chatHandler = require('./routes/chat.route');
const conversationRouteHandler = require('./routes/conversation.route');
const { relationshipGraphHandler, searchHandler } = require('./routes/intelligence.route');
const { getTrendsHandler, getFiltersHandler } = require('./routes/analytics.route');

const routes = {
  'GET /health': healthHandler,
  'GET /officer': officerHandler,
  'GET /case': caseHandler,
  'GET /accused': accusedHandler,
  'GET /victim': victimHandler,
  'GET /investigating-officer': investigatingOfficerHandler,
  'GET /unit': unitHandler,
  'GET /court': courtHandler,
  
  // Feature 10A Endpoints & Required Aliases
  'POST /chat': chatHandler,
  'GET /fir': caseHandler,
  'GET /criminal': accusedHandler,

  // Feature 12A Persistent History Endpoints
  'POST /conversation/start': conversationRouteHandler,
  'GET /conversations': conversationRouteHandler,
  'GET /conversation/:conversationId': conversationRouteHandler,
  'GET /conversation/:conversationId/export/pdf': conversationRouteHandler,
  'POST /conversation/:conversationId/continue': conversationRouteHandler,
  'DELETE /conversation/:conversationId': conversationRouteHandler,
  
  // Feature 16 Criminal Relationship Graph
  'GET /intelligence/relationship-graph': relationshipGraphHandler,
  'GET /intelligence/search': searchHandler,

  // Feature 19 Crime Trend Analysis
  'GET /intelligence/analytics/trends': getTrendsHandler,
  'GET /intelligence/analytics/filters': getFiltersHandler
};

async function dispatch(req, res) {
  console.log('METHOD:', req.method, 'URL:', JSON.stringify(req.url));
  const parsedUrl = req.url.split('?')[0];
  
  // Try exact lookup first
  const exactKey = `${req.method} ${parsedUrl}`;
  let handler = routes[exactKey];

  // Fallback: parameterized regex path matching
  if (!handler) {
    for (const routeKey of Object.keys(routes)) {
      const [method, routePath] = routeKey.split(' ');
      if (method !== req.method) continue;

      // Map parameters like :conversationId to regex capture groups
      const regexPath = routePath.replace(/:[a-zA-Z0-9_]+/g, '([^/]+)');
      const regex = new RegExp(`^${regexPath}$`);
      const match = parsedUrl.match(regex);

      if (match) {
        req.params = req.params || {};
        const paramNames = (routePath.match(/:[a-zA-Z0-9_]+/g) || []).map(p => p.slice(1));
        paramNames.forEach((name, i) => {
          req.params[name] = match[i + 1];
        });
        handler = routes[routeKey];
        break;
      }
    }
  }

  if (handler) {
    await handler(req, res);
  } else {
    sendError(res, 404, 'Route not found');
  }
}

module.exports = { dispatch };