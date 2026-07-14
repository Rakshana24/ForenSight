const catalyst = require('zcatalyst-sdk-node');
const url = require('url');
const { sendJSON, sendError } = require('../utils/response');
const AccusedService = require('../services/accused.service');

const accusedHandler = async (req, res) => {
  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    
    const parsedUrl = url.parse(req.url, true);
    const { accusedID, accusedName, caseID } = parsedUrl.query;

    const accusedService = new AccusedService(zcql);
    const accusedData = await accusedService.getAccusedDetails({ accusedID, accusedName, caseID });

    return sendJSON(res, 200, accusedData);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return sendError(res, statusCode, error.message);
  }
};

module.exports = accusedHandler;
