/**
 * CaseRepository Unit Tests.
 * Asserts correctness of ZCQL composition and SQL logic using a mock executeZCQL hook.
 */

const assert = require('assert');
const CaseRepository = require('../../functions/foren_sight_function/repositories/caseRepository');

async function runRepositoryTests() {
  console.log('▶ [UNIT] Running CaseRepository Tests...');

  const capturedQueries = [];

  // Mock Catalyst App and zcql handler
  const mockApp = {
    datastore: () => ({}),
    zcql: () => ({
      executeZCQLQuery: async (query) => {
        capturedQueries.push(query.trim().replace(/\s+/g, ' '));
        
        // Mock responses based on which table is being queried
        if (query.includes('FROM CaseMaster')) {
          return [
            {
              CaseMaster: {
                CaseMasterID: '123',
                CrimeNo: '100160057202100001',
                CaseNo: '202100001',
                CrimeRegisteredDate: '2021-05-03',
                PolicePersonID: '262',
                PoliceStationID: '57',
                CrimeMajorHeadID: '7',
                CrimeMinorHeadID: '42',
                CourtID: '16',
                CaseStatusID: '5'
              }
            }
          ];
        }

        if (query.includes('FROM Court')) {
          return [{ Court: { CourtID: '16', CourtName: 'District Court' } }];
        }

        if (query.includes('FROM Unit')) {
          return [{ Unit: { UnitID: '57', UnitName: 'Station X' } }];
        }

        if (query.includes('FROM Employee')) {
          return [{ Employee: { EmployeeID: '262', FirstName: 'Officer A', RankID: '3', DesignationID: '1' } }];
        }

        if (query.includes('FROM CaseStatusMaster')) {
          return [{ CaseStatusMaster: { CaseStatusID: '5', CaseStatusName: 'Under Trial' } }];
        }

        if (query.includes('FROM CrimeHead')) {
          return [{ CrimeHead: { CrimeHeadID: '7', CrimeGroupName: 'Excise' } }];
        }

        if (query.includes('FROM CrimeSubHead')) {
          return [{ CrimeSubHead: { CrimeSubHeadID: '42', CrimeHeadName: 'Liquor' } }];
        }

        if (query.includes('FROM Rank')) {
          return [{ Rank: { RankID: '3', RankName: 'ASI' } }];
        }

        if (query.includes('FROM Designation')) {
          return [{ Designation: { DesignationID: '1', DesignationName: 'IO' } }];
        }

        if (query.includes('FROM ActSectionAssociation')) {
          return [
            {
              Act: { ActCode: 'EXCISE' },
              Section: { SectionCode: 'EXCISE-32', SectionDescription: 'Selling liquor' }
            }
          ];
        }

        return [];
      }
    })
  };

  const repository = new CaseRepository(mockApp);
  
  // Execute Search FIR by CaseMasterID
  const result = await repository.findCase({ caseMasterId: 123 });

  // 1. Assert Query splits are compose and dispatched correctly
  assert.strictEqual(capturedQueries.length, 10, 'Repository must dispatch exactly 10 queries.');
  
  // Verify first query constraints
  assert.match(capturedQueries[0], /CaseMasterID = 123/);
  
  // Verify secondary lookups match
  assert.match(capturedQueries[1], /FROM Court WHERE CourtID = 16/);
  assert.match(capturedQueries[2], /FROM Unit WHERE UnitID = 57/);
  assert.match(capturedQueries[3], /FROM Employee WHERE EmployeeID = 262/);
  assert.match(capturedQueries[4], /FROM CaseStatusMaster WHERE CaseStatusID = 5/);
  assert.match(capturedQueries[5], /FROM CrimeHead WHERE CrimeHeadID = 7/);
  assert.match(capturedQueries[6], /FROM CrimeSubHead WHERE CrimeSubHeadID = 42/);
  assert.match(capturedQueries[7], /FROM Rank WHERE RankID = 3/);
  assert.match(capturedQueries[8], /FROM Designation WHERE DesignationID = 1/);
  assert.match(capturedQueries[9], /FROM ActSectionAssociation/);

  // 2. Assert Flattened mappings
  assert.strictEqual(result.CaseMasterID, '123');
  assert.strictEqual(result.CrimeNo, '100160057202100001');
  assert.strictEqual(result.CourtName, 'District Court');
  assert.strictEqual(result.UnitName, 'Station X');
  assert.strictEqual(result.CaseStatusName, 'Under Trial');
  
  // Verify secondary entity attachment
  assert.strictEqual(result.CrimeHead.CrimeGroupName, 'Excise');
  assert.strictEqual(result.CrimeSubHead.CrimeHeadName, 'Liquor');
  assert.strictEqual(result.Rank.RankName, 'ASI');
  assert.strictEqual(result.Designation.DesignationName, 'IO');
  assert.strictEqual(result.actsAndSections[0].actCode, 'EXCISE');
  assert.strictEqual(result.actsAndSections[0].sectionCode, 'EXCISE-32');

  console.log('✔ [UNIT] CaseRepository Tests Passed!');
}

module.exports = runRepositoryTests;
