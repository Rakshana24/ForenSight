const catalyst = require('zcatalyst-sdk-node');
const url = require('url');
const { sendJSON, sendError } = require('../utils/response');
const InvestigatingOfficerService = require('../services/investigatingOfficer.service');

const investigatingOfficerHandler = async (req, res) => {
  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    
    const parsedUrl = url.parse(req.url, true);
    const { caseID, crimeNumber } = parsedUrl.query;

    const investigatingOfficerService = new InvestigatingOfficerService(zcql);
    const officerData = await investigatingOfficerService.getInvestigatingOfficerDetails({ caseID, crimeNumber });

    return sendJSON(res, 200, officerData);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return sendError(res, statusCode, error.message);
  }
};

module.exports = investigatingOfficerHandler;
