const catalyst = require('zcatalyst-sdk-node');
const url = require('url');
const { sendJSON, sendError } = require('../utils/response');
const IntelligenceService = require('../services/intelligence.service');

const relationshipGraphHandler = async (req, res) => {
  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    
    const parsedUrl = url.parse(req.url, true);
    const { caseID } = parsedUrl.query;
    
    const intelligenceService = new IntelligenceService(zcql);
    const graphData = await intelligenceService.getRelationshipGraph(caseID);

    return sendJSON(res, 200, graphData);
  } catch (error) {
    console.error('[DEBUG] Intelligence API Exception stack trace:', error.stack || error);
    console.log(`[DEBUG] Graph generation failed: ${error.message}`);
    const statusCode = error.statusCode || 500;
    return sendError(res, statusCode, error.message);
  }
};

const searchHandler = async (req, res) => {
  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    
    const parsedUrl = url.parse(req.url, true);
    const { searchType, searchValue } = parsedUrl.query;
    
    if (!searchType || !searchValue) {
      return sendError(res, 400, 'searchType and searchValue are required');
    }
    
    const intelligenceService = new IntelligenceService(zcql);
    const cases = await intelligenceService.searchCases(searchType, searchValue);

    return sendJSON(res, 200, cases);
  } catch (error) {
    console.error('[DEBUG] Intelligence Search API Exception:', error.stack || error);
    const statusCode = error.statusCode || 500;
    return sendError(res, statusCode, error.message);
  }
};

module.exports = {
  relationshipGraphHandler,
  searchHandler
};
