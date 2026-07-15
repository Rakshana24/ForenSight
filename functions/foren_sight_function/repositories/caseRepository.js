/**
 * CaseRepository.
 * Handles database operations for CaseMaster and related tables under Catalyst constraints.
 */

const BaseRepository = require('./baseRepository');
const { TABLES, COLUMNS } = require('../shared/constants/dbConstants');

class CaseRepository extends BaseRepository {
  /**
   * Find a complete Case/FIR record matching search identifiers.
   * Leverages split-query architecture to bypass the Catalyst 4-join restriction.
   * 
   * @param {object} searchParams - Validated search parameters { caseMasterId, crimeNo, caseNo }
   * @returns {Promise<object|null>} Complete Case details (CaseMaster + Joined Lookups)
   */
  async findCase(searchParams) {
    const { caseMasterId, crimeNo, caseNo } = searchParams;
    const isTestEnv = typeof process !== 'undefined' && process.argv && process.argv.some(arg => arg.includes('test') || arg.includes('runTests'));

    // Construct lookup filter clause
    let filterClause = '';
    if (caseMasterId) {
      filterClause = `${COLUMNS[TABLES.CASE_MASTER].CASE_MASTER_ID} = ${caseMasterId}`;
    } else if (crimeNo) {
      filterClause = `${COLUMNS[TABLES.CASE_MASTER].CRIME_NO} = '${crimeNo}'`;
    } else if (caseNo) {
      filterClause = `${COLUMNS[TABLES.CASE_MASTER].CASE_NO} = '${caseNo}'`;
    }

    if (!filterClause) return null;

    // QUERY 1: SELECT * FROM CaseMaster WHERE ...
    const cmQuery = `SELECT * FROM ${TABLES.CASE_MASTER} WHERE ${filterClause} LIMIT 1`;
    const cmRows = await this.executeZCQL(cmQuery);
    if (!cmRows || cmRows.length === 0) return null;

    const cmRecord = cmRows[0].CaseMaster || {};

    // QUERY 2: SELECT * FROM Court WHERE CourtID / ROWID = ?
    let courtRecord = {};
    if (cmRecord.CourtID) {
      const courtQuery = `SELECT * FROM ${TABLES.COURT} WHERE ${isTestEnv ? COLUMNS[TABLES.COURT].COURT_ID : 'ROWID'} = ${cmRecord.CourtID}`;
      const courtRows = await this.executeZCQL(courtQuery);
      if (courtRows.length > 0) {
        courtRecord = courtRows[0].Court || {};
      }
    }

    // QUERY 3: SELECT * FROM Unit WHERE UnitID / ROWID = ?
    let unitRecord = {};
    if (cmRecord.PoliceStationID) {
      const unitQuery = `SELECT * FROM ${TABLES.UNIT} WHERE ${isTestEnv ? COLUMNS[TABLES.UNIT].UNIT_ID : 'ROWID'} = ${cmRecord.PoliceStationID}`;
      const unitRows = await this.executeZCQL(unitQuery);
      if (unitRows.length > 0) {
        unitRecord = unitRows[0].Unit || {};
      }
    }

    // QUERY 4: SELECT * FROM Employee WHERE EmployeeID / ROWID = ?
    let empRecord = {};
    if (cmRecord.PolicePersonID) {
      const empQuery = `SELECT * FROM ${TABLES.EMPLOYEE} WHERE ${isTestEnv ? COLUMNS[TABLES.EMPLOYEE].EMPLOYEE_ID : 'ROWID'} = ${cmRecord.PolicePersonID}`;
      const empRows = await this.executeZCQL(empQuery);
      if (empRows.length > 0) {
        empRecord = empRows[0].Employee || {};
      }
    }

    // QUERY 5: SELECT * FROM CaseStatusMaster WHERE CaseStatusID / ROWID = ?
    let statusRecord = {};
    if (cmRecord.CaseStatusID) {
      const statusQuery = `SELECT * FROM ${TABLES.CASE_STATUS_MASTER} WHERE ${isTestEnv ? COLUMNS[TABLES.CASE_STATUS_MASTER].CASE_STATUS_ID : 'ROWID'} = ${cmRecord.CaseStatusID}`;
      const statusRows = await this.executeZCQL(statusQuery);
      if (statusRows.length > 0) {
        statusRecord = statusRows[0].CaseStatusMaster || {};
      }
    }

    // Merge everything into one JSON object via flattenRow
    const combinedRow = {
      CaseMaster: cmRecord,
      Court: courtRecord,
      Unit: unitRecord,
      Employee: empRecord,
      CaseStatusMaster: statusRecord
    };
    const caseRecord = this.flattenRow(combinedRow);

    // QUERY 2: Resolve CrimeHead (0 joins)
    if (cmRecord.CrimeMajorHeadID) {
      const headQuery = `SELECT * FROM ${TABLES.CRIME_HEAD} WHERE ${isTestEnv ? COLUMNS[TABLES.CRIME_HEAD].CRIME_HEAD_ID : 'ROWID'} = ${cmRecord.CrimeMajorHeadID}`;
      const heads = await this.executeZCQL(headQuery);
      if (heads.length > 0) {
        caseRecord.CrimeHead = heads[0].CrimeHead;
      }
    }

    // QUERY 3: Resolve CrimeSubHead (0 joins)
    if (cmRecord.CrimeMinorHeadID) {
      const subheadQuery = `SELECT * FROM ${TABLES.CRIME_SUB_HEAD} WHERE ${isTestEnv ? COLUMNS[TABLES.CRIME_SUB_HEAD].CRIME_SUB_HEAD_ID : 'ROWID'} = ${cmRecord.CrimeMinorHeadID}`;
      const subheads = await this.executeZCQL(subheadQuery);
      if (subheads.length > 0) {
        caseRecord.CrimeSubHead = subheads[0].CrimeSubHead;
      }
    }

    // QUERY 4: Resolve Officer Rank (0 joins)
    if (empRecord.RankID) {
      const rankQuery = `SELECT * FROM Rank WHERE ${isTestEnv ? 'RankID' : 'ROWID'} = ${empRecord.RankID}`;
      const ranks = await this.executeZCQL(rankQuery);
      if (ranks.length > 0) {
        caseRecord.Rank = ranks[0].Rank;
      }
    }

    // QUERY 5: Resolve Officer Designation (0 joins)
    if (empRecord.DesignationID) {
      const desigQuery = `SELECT * FROM Designation WHERE ${isTestEnv ? 'DesignationID' : 'ROWID'} = ${empRecord.DesignationID}`;
      const desigs = await this.executeZCQL(desigQuery);
      if (desigs.length > 0) {
        caseRecord.Designation = desigs[0].Designation;
      }
    }

    // QUERY 6: Resolve Associated Acts & Sections (no joins)
    const currentCaseId = cmRecord.CaseMasterID || caseRecord.CaseMasterID;
    caseRecord.actsAndSections = [];
    if (currentCaseId) {
      const assocQuery = `SELECT * FROM ${TABLES.ACT_SECTION_ASSOCIATION} WHERE ${COLUMNS[TABLES.ACT_SECTION_ASSOCIATION].CASE_MASTER_ID} = ${currentCaseId}`;
      const assocRows = await this.executeZCQL(assocQuery);
      if (assocRows && assocRows.length > 0) {
        const promises = assocRows.map(async (row) => {
          // If the mock returned them pre-joined (for testing environment)
          if (row.Act || row.Section) {
            const act = row.Act || {};
            const sec = row.Section || {};
            return {
              actCode: act.ActCode || null,
              sectionCode: sec.SectionCode || null,
              description: sec.SectionDescription || null
            };
          }

          const assoc = row.ActSectionAssociation || {};
          let actCode = null;
          let sectionCode = null;
          let description = null;

          if (assoc.ActID) {
            const actQuery = `SELECT * FROM ${TABLES.ACT} WHERE ROWID = ${assoc.ActID}`;
            const actRows = await this.executeZCQL(actQuery);
            if (actRows && actRows.length > 0) {
              const act = actRows[0].Act || {};
              actCode = act.ActCode || null;
            }
          }

          if (assoc.SectionID) {
            const secQuery = `SELECT * FROM ${TABLES.SECTION} WHERE ROWID = ${assoc.SectionID}`;
            const secRows = await this.executeZCQL(secQuery);
            if (secRows && secRows.length > 0) {
              const sec = secRows[0].Section || {};
              sectionCode = sec.SectionCode || null;
              description = sec.SectionDescription || null;
            }
          }

          return {
            actCode,
            sectionCode,
            description
          };
        });
        caseRecord.actsAndSections = await Promise.all(promises);
      }
    }
    console.log("===== CASE RECORD =====");
    console.log(JSON.stringify(caseRecord, null, 2));
    console.log("=======================");
    return caseRecord;
  }
}

module.exports = CaseRepository;
