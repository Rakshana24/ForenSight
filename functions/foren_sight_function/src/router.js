'use strict';

const catalyst = require('zcatalyst-sdk-node');
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
const voiceRouteHandler = require('./routes/voice.route');
const ttsRouteHandler = require('./routes/tts.route');
const { relationshipGraphHandler, searchHandler } = require('./routes/intelligence.route');
const { getTrendsHandler, getHotspotsHandler, getFiltersHandler, getClustersHandler, getSeasonalHandler, getDemographicsHandler, getSocioEconomicsHandler, getSocialRiskHandler } = require('./routes/analytics.route');

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
  'POST /voice/transcribe': voiceRouteHandler,
  'POST /voice/tts': ttsRouteHandler,
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
  'GET /intelligence/analytics/hotspots': getHotspotsHandler,
  'GET /intelligence/analytics/filters': getFiltersHandler,
  'GET /intelligence/analytics/clusters': getClustersHandler,
  'GET /intelligence/analytics/seasonal': getSeasonalHandler,
  
  // Feature 23 Demographic Crime Analysis
  'GET /intelligence/analytics/demographics': getDemographicsHandler,

  // Feature 24 Socio-economic Crime Analysis
  'GET /intelligence/analytics/socio-economic': getSocioEconomicsHandler,

  // Feature 25 Social Risk Analysis
  'GET /intelligence/analytics/social-risk': getSocialRiskHandler
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
    if (parsedUrl === '/health') {
      await handler(req, res);
      return;
    }

    try {
      req._useUserScope = true;
      const app = catalyst.initialize(req);
      await app.userManagement().getCurrentUser();
      req._useUserScope = false;
      
      // User is verified, proceed with request
      await handler(req, res);
    } catch (err) {
      console.error('API request auth validation failed:', err.message || err);
      sendError(res, 401, 'Unauthorized');
    }
  } else {
    sendError(res, 404, 'Route not found');
  }
}

module.exports = { dispatch };