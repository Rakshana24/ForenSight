/**
 * CrimeService Unit Tests.
 * Uses native assert module and overrides CaseRepository prototype for isolated mock testing.
 */

const assert = require('assert');
const CrimeService = require('../../functions/foren_sight_function/services/crimeService');
const CaseRepository = require('../../functions/foren_sight_function/repositories/caseRepository');

// Store original function reference
const originalFindCase = CaseRepository.prototype.findCase;

async function runServiceTests() {
  console.log('▶ [UNIT] Running CrimeService Tests...');

  const mockApp = {
    datastore: () => ({}),
    zcql: () => ({})
  };

  const service = new CrimeService(mockApp);

  // Test Case 1: Empty Query Input Validation Failure
  try {
    await service.searchFIR({});
    assert.fail('Validation should have thrown an error for empty search params.');
  } catch (err) {
    assert.strictEqual(err.name, 'ValidationError');
    assert.match(err.message, /At least one search parameter/);
  }

  // Test Case 2: Invalid formatting input criteria
  try {
    await service.searchFIR({ crimeNo: 'invalid-non-numeric' });
    assert.fail('Validation should have thrown an error for non-numeric crimeNo.');
  } catch (err) {
    assert.strictEqual(err.name, 'ValidationError');
    assert.match(err.message, /crimeNo/);
  }

  // Test Case 3: Successful Search FIR & DTO Mapper Verification
  CaseRepository.prototype.findCase = async (params) => {
    assert.strictEqual(params.crimeNo, '100160057202100001');
    return {
      CaseMaster: {
        CaseMasterID: 1,
        CrimeNo: '100160057202100001',
        CaseNo: '202100001',
        BriefFacts: 'Liquor seized'
      },
      Court: { CourtID: 16, CourtName: 'District Court Bengaluru' },
      Unit: { UnitID: 57, UnitName: 'Station Chikkamagaluru' },
      CrimeHead: { CrimeHeadID: 7, CrimeGroupName: 'Excise Crimes' },
      CrimeSubHead: { CrimeSubHeadID: 42, CrimeHeadName: 'Illicit Liquor' },
      CaseStatusMaster: { CaseStatusID: 5, CaseStatusName: 'Under Trial' },
      Employee: { EmployeeID: 262, FirstName: 'Inspector Sharma', KGID: 'KA262' },
      Rank: { RankName: 'Circle Inspector' },
      Designation: { DesignationName: 'Investigating Officer' },
      actsAndSections: [
        { actCode: 'EXCISE', sectionCode: 'EXCISE-32', description: 'Excise penalty' }
      ]
    };
  };

  const result = await service.searchFIR({ crimeNo: '100160057202100001' });
  
  assert.strictEqual(result.caseMasterId, 1);
  assert.strictEqual(result.crimeNumber, '100160057202100001');
  assert.strictEqual(result.caseNumber, '202100001');
  assert.strictEqual(result.briefFacts, 'Liquor seized');
  
  // Verify Joined Lookup mappings
  assert.strictEqual(result.court.courtName, 'District Court Bengaluru');
  assert.strictEqual(result.policeStation.stationName, 'Station Chikkamagaluru');
  assert.strictEqual(result.crimeHead.crimeGroupName, 'Excise Crimes');
  assert.strictEqual(result.crimeSubHead.crimeSubHeadName, 'Illicit Liquor');
  assert.strictEqual(result.caseStatus.caseStatusName, 'Under Trial');
  
  // Verify Officer designation mappings
  assert.strictEqual(result.investigatingOfficer.firstName, 'Inspector Sharma');
  assert.strictEqual(result.investigatingOfficer.kgid, 'KA262');
  assert.strictEqual(result.investigatingOfficer.rank, 'Circle Inspector');
  assert.strictEqual(result.investigatingOfficer.designation, 'Investigating Officer');

  // Verify Associated Acts & Sections mapping
  assert.strictEqual(result.actsAndSections.length, 1);
  assert.strictEqual(result.actsAndSections[0].actCode, 'EXCISE');
  assert.strictEqual(result.actsAndSections[0].sectionCode, 'EXCISE-32');
  
  // Test Case 4: NotFoundException triggers on missing record
  CaseRepository.prototype.findCase = async () => null;
  try {
    await service.searchFIR({ caseMasterId: 999 });
    assert.fail('Should have failed with NotFoundError for missing ID.');
  } catch (err) {
    assert.strictEqual(err.name, 'NotFoundError');
    assert.match(err.message, /matching criteria/);
  }

  // Restore CaseRepository behaviour
  CaseRepository.prototype.findCase = originalFindCase;
  console.log('✔ [UNIT] CrimeService Tests Passed!');
}

module.exports = runServiceTests;
