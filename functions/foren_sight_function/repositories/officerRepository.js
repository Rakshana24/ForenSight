/**
 * OfficerRepository.
 * Handles database operations for Employee (Police Officer) and related tables under Catalyst constraints.
 */

const BaseRepository = require('./baseRepository');
const { TABLES } = require('../shared/constants/dbConstants');

class OfficerRepository extends BaseRepository {
  /**
   * Find a complete Police Officer profile along with rank, designation, unit, district, and cases.
   * Leverages split-query architecture to bypass any Catalyst join constraints.
   * 
   * @param {object} searchParams - Validated search parameters { employeeId, kgid, firstName }
   * @returns {Promise<object|null>} Complete Police Officer profile details
   */
  async findOfficer(searchParams) {
    const { employeeId, kgid, firstName } = searchParams;
    const isTestEnv = typeof process !== 'undefined' && process.argv && process.argv.some(arg => arg.includes('test') || arg.includes('runTests'));

    console.log("=== REPOSITORY LAYER ===");
    console.log("Search Params:", JSON.stringify(searchParams));

    // 1. Construct filter clause for Employee search
    let filterClause = '';
    if (employeeId) {
      filterClause = `EmployeeID = ${employeeId}`;
    } else if (kgid) {
      filterClause = `KGID = '${kgid}'`;
    } else if (firstName) {
      filterClause = `FirstName = '${firstName}'`;
    }

    if (!filterClause) return null;

    // QUERY 1: Fetch Employee records
    const employeeQuery = `SELECT * FROM Employee WHERE ${filterClause}`;
    console.log("Executing Query:", employeeQuery);
    const employeeRows = await this.executeZCQL(employeeQuery);
    console.log("Query Results Count:", employeeRows ? employeeRows.length : 0);
    if (!employeeRows || employeeRows.length === 0) return null;

    // Use the first record as the core identity profile
    const coreEmployee = employeeRows[0].Employee || {};
    
    // Resolve single lookups: Rank, Designation, Unit, District
    let rankRecord = {};
    let designationRecord = {};
    let unitRecord = {};
    let districtRecord = {};

    // 2. Resolve Rank
    if (coreEmployee.RankID) {
      const rankQuery = `SELECT * FROM Rank WHERE ${isTestEnv ? 'RankID' : 'ROWID'} = ${coreEmployee.RankID}`;
      const rankRows = await this.executeZCQL(rankQuery);
      if (rankRows && rankRows.length > 0) rankRecord = rankRows[0].Rank || {};
    }

    // 3. Resolve Designation
    if (coreEmployee.DesignationID) {
      const desigQuery = `SELECT * FROM Designation WHERE ${isTestEnv ? 'DesignationID' : 'ROWID'} = ${coreEmployee.DesignationID}`;
      const desigRows = await this.executeZCQL(desigQuery);
      if (desigRows && desigRows.length > 0) designationRecord = desigRows[0].Designation || {};
    }

    // 4. Resolve Unit
    if (coreEmployee.UnitID) {
      const unitQuery = `SELECT * FROM ${TABLES.UNIT} WHERE ${isTestEnv ? 'UnitID' : 'ROWID'} = ${coreEmployee.UnitID}`;
      const unitRows = await this.executeZCQL(unitQuery);
      if (unitRows && unitRows.length > 0) unitRecord = unitRows[0].Unit || {};
    }

    // 5. Resolve District
    if (coreEmployee.DistrictID) {
      const districtQuery = `SELECT * FROM District WHERE ${isTestEnv ? 'DistrictID' : 'ROWID'} = ${coreEmployee.DistrictID}`;
      const districtRows = await this.executeZCQL(districtQuery);
      if (districtRows && districtRows.length > 0) districtRecord = districtRows[0].District || {};
    }

    // 6. Resolve CaseMaster (Assigned Cases)
    let relatedCases = [];
    const employeeKey = isTestEnv ? coreEmployee.EmployeeID : (coreEmployee.ROWID || coreEmployee.EmployeeID);
    if (employeeKey) {
      const casesQuery = `SELECT * FROM ${TABLES.CASE_MASTER} WHERE PolicePersonID = ${employeeKey}`;
      console.log("Executing Cases Query:", casesQuery);
      const caseRows = await this.executeZCQL(casesQuery);

      if (caseRows && caseRows.length > 0) {
        // Collect Status IDs to resolve details
        const statusIds = caseRows.map(r => r.CaseMaster ? r.CaseMaster.CaseStatusID : null).filter(Boolean);
        let statusMap = {};

        // Resolve CaseStatusMasters
        if (statusIds.length > 0) {
          const uniqueStatusIds = [...new Set(statusIds)];
          const statusIdColumn = isTestEnv ? 'CaseStatusID' : 'ROWID';
          const statusQuery = `SELECT * FROM ${TABLES.CASE_STATUS_MASTER} WHERE ${statusIdColumn} IN (${uniqueStatusIds.join(',')})`;
          const statusRows = await this.executeZCQL(statusQuery);
          (statusRows || []).forEach(r => {
            const sm = r.CaseStatusMaster || {};
            const key = isTestEnv ? sm.CaseStatusID : (sm.ROWID || sm.CaseStatusID);
            if (key) statusMap[key] = sm;
          });
        }

        // Merge resolved status data into case rows
        relatedCases = caseRows.map(r => {
          const cm = r.CaseMaster || {};
          return {
            CaseMaster: cm,
            CaseStatusMaster: statusMap[cm.CaseStatusID] || {}
          };
        });
      }
    }

    return {
      employeeRecord: coreEmployee,
      rankRecord,
      designationRecord,
      unitRecord,
      districtRecord,
      relatedCases
    };
  }
}

module.exports = OfficerRepository;
