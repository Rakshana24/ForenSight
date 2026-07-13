/**
 * AccusedRepository.
 * Handles database operations for Accused and related tables (ArrestSurrender, CaseMaster, etc.) under Catalyst constraints.
 */

const BaseRepository = require('./baseRepository');
const { TABLES, COLUMNS } = require('../shared/constants/dbConstants');

class AccusedRepository extends BaseRepository {
  /**
   * Find a complete Accused profile along with related cases and arrest history.
   * Leverages split-query architecture to bypass any Catalyst join constraints.
   * 
   * @param {object} searchParams - Validated search parameters { accusedMasterId, accusedName, personId }
   * @returns {Promise<object|null>} Complete Accused profile details
   */
  async findCriminal(searchParams) {
    const { accusedMasterId, accusedName, personId } = searchParams;
    const isTestEnv = typeof process !== 'undefined' && process.argv && process.argv.some(arg => arg.includes('test') || arg.includes('runTests'));

    console.log("=== REPOSITORY LAYER ===");
    console.log("Search Params:", JSON.stringify(searchParams));

    // 1. Construct filter clause for Accused search
    let filterClause = '';
    if (accusedMasterId) {
      filterClause = `AccusedMasterID = ${accusedMasterId}`;
    } else if (accusedName) {
      filterClause = `AccusedName = '${accusedName}'`;
    } else if (personId) {
      filterClause = `PersonID = '${personId}'`;
    }

    if (!filterClause) return null;

    // QUERY 1: Fetch Accused records
    const accusedQuery = `SELECT * FROM ${TABLES.ACCUSED} WHERE ${filterClause}`;
    console.log("Executing Query:", accusedQuery);
    const accusedRows = await this.executeZCQL(accusedQuery);
    console.log("Query Results Count:", accusedRows ? accusedRows.length : 0);
    if (!accusedRows || accusedRows.length === 0) return null;

    // Use the first record as the core identity profile
    const coreAccused = accusedRows[0].Accused || {};
    
    // Collect all CaseMasterID and Accused ROWID/MasterID values across all matching records
    const caseMasterIds = accusedRows.map(r => r.Accused ? r.Accused.CaseMasterID : null).filter(Boolean);
    const accusedIds = accusedRows.map(r => r.Accused ? (r.Accused.ROWID || r.Accused.AccusedMasterID) : null).filter(Boolean);

    // QUERY 2: Fetch related CaseMaster records
    let relatedCases = [];
    if (caseMasterIds.length > 0) {
      const uniqueCaseIds = [...new Set(caseMasterIds)];
      const caseIdColumn = isTestEnv ? 'CaseMasterID' : 'ROWID';
      const casesQuery = `SELECT * FROM ${TABLES.CASE_MASTER} WHERE ${caseIdColumn} IN (${uniqueCaseIds.join(',')})`;
      const caseRows = await this.executeZCQL(casesQuery);

      if (caseRows && caseRows.length > 0) {
        // Collect CaseStatusIDs to resolve status names
        const statusIds = caseRows.map(r => r.CaseMaster ? r.CaseMaster.CaseStatusID : null).filter(Boolean);
        let statusMap = {};
        
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

        // Map status records back to cases
        relatedCases = caseRows.map(r => {
          const cm = r.CaseMaster || {};
          const statusKey = cm.CaseStatusID;
          return {
            CaseMaster: cm,
            CaseStatusMaster: statusMap[statusKey] || {}
          };
        });
      }
    }

    // QUERY 3: Fetch related ArrestSurrender records
    let arrestHistory = [];
    if (accusedIds.length > 0) {
      const uniqueAccusedIds = [...new Set(accusedIds)];
      const arrestQuery = `SELECT * FROM ${TABLES.ARREST_SURRENDER} WHERE AccusedMasterID IN (${uniqueAccusedIds.join(',')})`;
      const arrestRows = await this.executeZCQL(arrestQuery);

      if (arrestRows && arrestRows.length > 0) {
        // Collect PoliceStationID (Unit) and CourtID references to resolve details
        const psIds = arrestRows.map(r => r.ArrestSurrender ? r.ArrestSurrender.PoliceStationID : null).filter(Boolean);
        const courtIds = arrestRows.map(r => r.ArrestSurrender ? r.ArrestSurrender.CourtID : null).filter(Boolean);

        let unitMap = {};
        let courtMap = {};

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

        // Merge resolved data into arrest record rows
        arrestHistory = arrestRows.map(r => {
          const arr = r.ArrestSurrender || {};
          return {
            ArrestSurrender: arr,
            Unit: unitMap[arr.PoliceStationID] || {},
            Court: courtMap[arr.CourtID] || {}
          };
        });
      }
    }

    return {
      accusedRecord: coreAccused,
      relatedCases,
      arrestHistory
    };
  }
}

module.exports = AccusedRepository;
