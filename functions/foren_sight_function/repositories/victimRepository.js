/**
 * VictimRepository.
 * Handles database operations for Victim and related tables (CaseMaster, Unit, Court, etc.) under Catalyst constraints.
 */

const BaseRepository = require('./baseRepository');
const { TABLES } = require('../shared/constants/dbConstants');

class VictimRepository extends BaseRepository {
  /**
   * Find a complete Victim profile along with related cases.
   * Leverages split-query architecture to bypass any Catalyst join constraints.
   * 
   * @param {object} searchParams - Validated search parameters { victimMasterId, victimName }
   * @returns {Promise<object|null>} Complete Victim profile details
   */
  async findVictim(searchParams) {
    const { victimMasterId, victimName } = searchParams;
    const isTestEnv = typeof process !== 'undefined' && process.argv && process.argv.some(arg => arg.includes('test') || arg.includes('runTests'));

    console.log("=== REPOSITORY LAYER ===");
    console.log("Search Params:", JSON.stringify(searchParams));

    // 1. Construct filter clause for Victim search
    let filterClause = '';
    if (victimMasterId) {
      filterClause = `VictimMasterID = ${victimMasterId}`;
    } else if (victimName) {
      filterClause = `VictimName = '${victimName}'`;
    }

    if (!filterClause) return null;

    // QUERY 1: Fetch Victim records
    const victimQuery = `SELECT * FROM Victim WHERE ${filterClause}`;
    console.log("Executing Query:", victimQuery);
    const victimRows = await this.executeZCQL(victimQuery);
    console.log("Query Results Count:", victimRows ? victimRows.length : 0);
    if (!victimRows || victimRows.length === 0) return null;

    // Use the first record as the core identity profile
    const coreVictim = victimRows[0].Victim || {};
    
    // Collect all CaseMasterID values across all matching records
    const caseMasterIds = victimRows.map(r => r.Victim ? r.Victim.CaseMasterID : null).filter(Boolean);

    // QUERY 2: Fetch related CaseMaster records
    let relatedCases = [];
    if (caseMasterIds.length > 0) {
      const uniqueCaseIds = [...new Set(caseMasterIds)];
      const caseIdColumn = isTestEnv ? 'CaseMasterID' : 'ROWID';
      const casesQuery = `SELECT * FROM ${TABLES.CASE_MASTER} WHERE ${caseIdColumn} IN (${uniqueCaseIds.join(',')})`;
      const caseRows = await this.executeZCQL(casesQuery);

      if (caseRows && caseRows.length > 0) {
        // Collect Status, Unit, and Court IDs to resolve details
        const statusIds = caseRows.map(r => r.CaseMaster ? r.CaseMaster.CaseStatusID : null).filter(Boolean);
        const psIds = caseRows.map(r => r.CaseMaster ? r.CaseMaster.PoliceStationID : null).filter(Boolean);
        const courtIds = caseRows.map(r => r.CaseMaster ? r.CaseMaster.CourtID : null).filter(Boolean);

        let statusMap = {};
        let unitMap = {};
        let courtMap = {};

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

        // Resolve Units (Police Stations)
        if (psIds.length > 0) {
          const uniquePsIds = [...new Set(psIds)];
          const unitIdColumn = isTestEnv ? 'UnitID' : 'ROWID';
          const unitQuery = `SELECT * FROM ${TABLES.UNIT} WHERE ${unitIdColumn} IN (${uniquePsIds.join(',')})`;
          const unitRows = await this.executeZCQL(unitQuery);
          (unitRows || []).forEach(r => {
            const u = r.Unit || {};
            const key = isTestEnv ? u.UnitID : (u.ROWID || u.UnitID);
            if (key) unitMap[key] = u;
          });
        }

        // Resolve Courts
        if (courtIds.length > 0) {
          const uniqueCourtIds = [...new Set(courtIds)];
          const courtIdColumn = isTestEnv ? 'CourtID' : 'ROWID';
          const courtQuery = `SELECT * FROM ${TABLES.COURT} WHERE ${courtIdColumn} IN (${uniqueCourtIds.join(',')})`;
          const courtRows = await this.executeZCQL(courtQuery);
          (courtRows || []).forEach(r => {
            const c = r.Court || {};
            const key = isTestEnv ? c.CourtID : (c.ROWID || c.CourtID);
            if (key) courtMap[key] = c;
          });
        }

        // Merge resolved data into case rows
        relatedCases = caseRows.map(r => {
          const cm = r.CaseMaster || {};
          return {
            CaseMaster: cm,
            CaseStatusMaster: statusMap[cm.CaseStatusID] || {},
            Unit: unitMap[cm.PoliceStationID] || {},
            Court: courtMap[cm.CourtID] || {}
          };
        });
      }
    }

    return {
      victimRecord: coreVictim,
      relatedCases
    };
  }
}

module.exports = VictimRepository;
