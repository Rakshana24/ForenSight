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
    
    // Construct lookup filter clause
    let filterClause = '';
    if (caseMasterId) {
      filterClause = `cm.${COLUMNS[TABLES.CASE_MASTER].CASE_MASTER_ID} = ${caseMasterId}`;
    } else if (crimeNo) {
      filterClause = `cm.${COLUMNS[TABLES.CASE_MASTER].CRIME_NO} = '${crimeNo}'`;
    } else if (caseNo) {
      filterClause = `cm.${COLUMNS[TABLES.CASE_MASTER].CASE_NO} = '${caseNo}'`;
    }

    if (!filterClause) return null;

    // QUERY 1: Join 4 tables (Max Joins allowed in single ZCQL is 4)
    // Joins: Court, Unit (PoliceStation), CaseStatusMaster, Employee (Investigating Officer)
    const baseQuery = `
      SELECT 
        cm.*, 
        c.*, 
        u.*, 
        s.*, 
        e.* 
      FROM ${TABLES.CASE_MASTER} AS cm
      LEFT JOIN ${TABLES.COURT} AS c ON cm.${COLUMNS[TABLES.CASE_MASTER].COURT_ID} = c.${COLUMNS[TABLES.COURT].COURT_ID}
      LEFT JOIN ${TABLES.UNIT} AS u ON cm.${COLUMNS[TABLES.CASE_MASTER].POLICE_STATION_ID} = u.${COLUMNS[TABLES.UNIT].UNIT_ID}
      LEFT JOIN ${TABLES.CASE_STATUS_MASTER} AS s ON cm.${COLUMNS[TABLES.CASE_MASTER].CASE_STATUS_ID} = s.${COLUMNS[TABLES.CASE_STATUS_MASTER].CASE_STATUS_ID}
      LEFT JOIN ${TABLES.EMPLOYEE} AS e ON cm.${COLUMNS[TABLES.CASE_MASTER].POLICE_PERSON_ID} = e.${COLUMNS[TABLES.EMPLOYEE].EMPLOYEE_ID}
      WHERE ${filterClause}
      LIMIT 1
    `;

    const rawRows = await this.executeZCQL(baseQuery);
    if (!rawRows || rawRows.length === 0) return null;

    // Extract first record and flatten its nested database tables
    const caseRecord = this.flattenRow(rawRows[0]);
    const cmRecord = rawRows[0].CaseMaster || {};
    const empRecord = rawRows[0].Employee || {};

    // QUERY 2: Resolve CrimeHead (0 joins)
    if (cmRecord.CrimeMajorHeadID) {
      const headQuery = `SELECT * FROM ${TABLES.CRIME_HEAD} WHERE ${COLUMNS[TABLES.CRIME_HEAD].CRIME_HEAD_ID} = ${cmRecord.CrimeMajorHeadID}`;
      const heads = await this.executeZCQL(headQuery);
      if (heads.length > 0) {
        caseRecord.CrimeHead = heads[0].CrimeHead;
      }
    }

    // QUERY 3: Resolve CrimeSubHead (0 joins)
    if (cmRecord.CrimeMinorHeadID) {
      const subheadQuery = `SELECT * FROM ${TABLES.CRIME_SUB_HEAD} WHERE ${COLUMNS[TABLES.CRIME_SUB_HEAD].CRIME_SUB_HEAD_ID} = ${cmRecord.CrimeMinorHeadID}`;
      const subheads = await this.executeZCQL(subheadQuery);
      if (subheads.length > 0) {
        caseRecord.CrimeSubHead = subheads[0].CrimeSubHead;
      }
    }

    // QUERY 4: Resolve Officer Rank (0 joins)
    if (empRecord.RankID) {
      const rankQuery = `SELECT * FROM Rank WHERE RankID = ${empRecord.RankID}`;
      const ranks = await this.executeZCQL(rankQuery);
      if (ranks.length > 0) {
        caseRecord.Rank = ranks[0].Rank;
      }
    }

    // QUERY 5: Resolve Officer Designation (0 joins)
    if (empRecord.DesignationID) {
      const desigQuery = `SELECT * FROM Designation WHERE DesignationID = ${empRecord.DesignationID}`;
      const desigs = await this.executeZCQL(desigQuery);
      if (desigs.length > 0) {
        caseRecord.Designation = desigs[0].Designation;
      }
    }

    // QUERY 6: Resolve Associated Acts & Sections (2 joins: Act and Section)
    const currentCaseId = cmRecord.CaseMasterID || caseRecord.CaseMasterID;
    if (currentCaseId) {
      const actsQuery = `
        SELECT 
          asa.*, 
          act.*, 
          sec.*
        FROM ${TABLES.ACT_SECTION_ASSOCIATION} AS asa
        INNER JOIN ${TABLES.ACT} AS act ON asa.${COLUMNS[TABLES.ACT_SECTION_ASSOCIATION].ACT_ID} = act.${COLUMNS[TABLES.ACT].ACT_CODE}
        INNER JOIN ${TABLES.SECTION} AS sec ON asa.${COLUMNS[TABLES.ACT_SECTION_ASSOCIATION].SECTION_ID} = sec.${COLUMNS[TABLES.SECTION].SECTION_CODE}
        WHERE asa.${COLUMNS[TABLES.ACT_SECTION_ASSOCIATION].CASE_MASTER_ID} = ${currentCaseId}
      `;
      const rawActs = await this.executeZCQL(actsQuery);
      caseRecord.actsAndSections = rawActs.map(row => {
        const act = row.Act || {};
        const sec = row.Section || {};
        return {
          actCode: act.ActCode || null,
          sectionCode: sec.SectionCode || null,
          description: sec.SectionDescription || null
        };
      });
    }

    return caseRecord;
  }
}

module.exports = CaseRepository;
