const catalyst = require('zcatalyst-sdk-node');
const url = require('url');
const { sendJSON, sendError } = require('../utils/response');
const UnitService = require('../services/unit.service');

const unitHandler = async (req, res) => {
  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    
    const parsedUrl = url.parse(req.url, true);
    const { unitID, unitName } = parsedUrl.query;

    const unitService = new UnitService(zcql);
    const unitData = await unitService.getUnitDetails({ unitID, unitName });

    return sendJSON(res, 200, unitData);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return sendError(res, statusCode, error.message);
  }
};

module.exports = unitHandler;
