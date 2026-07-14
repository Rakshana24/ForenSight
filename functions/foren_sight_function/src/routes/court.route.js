const catalyst = require('zcatalyst-sdk-node');
const url = require('url');
const { sendJSON, sendError } = require('../utils/response');
const CourtService = require('../services/court.service');

const courtHandler = async (req, res) => {
  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    
    const parsedUrl = url.parse(req.url, true);
    const { courtID, courtName } = parsedUrl.query;

    const courtService = new CourtService(zcql);
    const courtData = await courtService.getCourtDetails({ courtID, courtName });

    return sendJSON(res, 200, courtData);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return sendError(res, statusCode, error.message);
  }
};

module.exports = courtHandler;
