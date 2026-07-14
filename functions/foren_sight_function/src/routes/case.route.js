const catalyst = require('zcatalyst-sdk-node');
const url = require('url');
const { sendJSON, sendError } = require('../utils/response');
const CaseService = require('../services/case.service');

const caseHandler = async (req, res) => {
  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    
    const parsedUrl = url.parse(req.url, true);
    const { caseID, crimeNumber, firNumber, date, keyword } = parsedUrl.query;
    
    const caseService = new CaseService(zcql);
    const caseData = await caseService.getCaseDetails({ caseID, crimeNumber, firNumber, date, keyword });

    return sendJSON(res, 200, caseData);
  } catch (error) {
    console.error('[DEBUG] Exception stack trace:', error.stack || error);
    const statusCode = error.statusCode || 500;
    return sendError(res, statusCode, error.message);
  }
};

module.exports = caseHandler;
