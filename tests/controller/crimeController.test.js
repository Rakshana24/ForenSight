/**
 * CrimeController Unit Tests.
 * Mocks raw req, res, and CrimeService behavior.
 */

const assert = require('assert');
const CrimeController = require('../../functions/foren_sight_function/controllers/crimeController');
const CrimeService = require('../../functions/foren_sight_function/services/crimeService');

const originalSearchFIR = CrimeService.prototype.searchFIR;

async function runControllerTests() {
  console.log('▶ [UNIT] Running CrimeController Tests...');

  const mockApp = {
    datastore: () => ({}),
    zcql: () => ({})
  };
  const controller = new CrimeController(mockApp);

  const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  };

  // Test Case 1: Controller handles success flow correctly
  const mockResponseData = {
    caseMasterId: 1,
    crimeNumber: '100160057202100001'
  };

  CrimeService.prototype.searchFIR = async (params) => {
    assert.strictEqual(params.crimeNo, '100160057202100001');
    return mockResponseData;
  };

  let writeHeadStatus = null;
  let writeHeadHeaders = null;
  let responseData = null;

  const mockReq = {
    query: { crimeNo: '100160057202100001' }
  };

  const mockRes = {
    writeHead: (status, headers) => {
      writeHeadStatus = status;
      writeHeadHeaders = headers;
    },
    end: (data) => {
      responseData = JSON.parse(data);
    }
  };

  await controller.handleSearchFIR(mockReq, mockRes, mockLogger);

  assert.strictEqual(writeHeadStatus, 200);
  assert.strictEqual(writeHeadHeaders['Content-Type'], 'application/json');
  assert.strictEqual(responseData.success, true);
  assert.strictEqual(responseData.data.crimeNumber, '100160057202100001');
  assert.strictEqual(responseData.message, 'FIR record retrieved successfully.');

  // Restore CrimeService behavior
  CrimeService.prototype.searchFIR = originalSearchFIR;
  console.log('✔ [UNIT] CrimeController Tests Passed!');
}

module.exports = runControllerTests;
