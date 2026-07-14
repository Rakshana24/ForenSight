const catalyst = require('zcatalyst-sdk-node');
const url = require('url');
const { sendJSON, sendError } = require('../utils/response');
const VictimService = require('../services/victim.service');

const victimHandler = async (req, res) => {
  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    
    const parsedUrl = url.parse(req.url, true);
    const { victimID, victimName, caseID } = parsedUrl.query;

    const victimService = new VictimService(zcql);
    const victimData = await victimService.getVictimDetails({ victimID, victimName, caseID });

    return sendJSON(res, 200, victimData);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return sendError(res, statusCode, error.message);
  }
};

module.exports = victimHandler;
