'use strict';

const url = require('url');
const catalyst = require('zcatalyst-sdk-node');
const { sendJSON, sendError } = require('../utils/response');

async function officerHandler(req, res) {
  try {
    // Parse query parameters
    const parsedUrl = url.parse(req.url, true);
    const { officerID, badgeNumber, officerName } = parsedUrl.query;

    // Validate inputs
    if (!officerID && !badgeNumber && !officerName) {
      return sendError(res, 400, 'Bad Request: Must provide at least one search parameter (officerID, badgeNumber, or officerName).');
    }

    // Initialize Catalyst SDK
    const app = catalyst.initialize(req);
    const zcql = app.zcql();

    // Construct query securely
    let conditions = [];
    if (officerID) {
      conditions.push(`EmployeeID = '${officerID.replace(/'/g, "''")}'`);
    }
    if (badgeNumber) {
      conditions.push(`KGID = '${badgeNumber.replace(/'/g, "''")}'`);
    }
    if (officerName) {
      conditions.push(`FirstName = '${officerName.replace(/'/g, "''")}'`);
    }

    if (conditions.length === 0) {
      return sendError(res, 400, 'Please provide officerID, badgeNumber, or officerName');
    }

    const whereClause = conditions.join(' AND ');
    const query = `SELECT * FROM Employee WHERE ${whereClause}`;

    // Execute query
    const result = await zcql.executeZCQLQuery(query);

    if (!result || result.length === 0) {
      return sendError(res, 404, 'Officer not found.');
    }

    // Catalyst ZCQL returns data nested under the table name
    const officers = result.map(row => row.Employee);

    sendJSON(res, 200, {
      status: 'success',
      data: officers
    });

  } catch (error) {
    console.error('Error fetching officer profile:', error);
    sendError(res, 500, 'Internal Server Error while fetching officer profile.');
  }
}

module.exports = officerHandler;
