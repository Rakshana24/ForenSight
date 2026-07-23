// Inlined from shared/constants/dbConstants.js to avoid Catalyst build resolution errors
const TABLES = {
  CASE_MASTER: 'CaseMaster',
  COURT: 'Court',
  UNIT: 'Unit',
  CRIME_HEAD: 'CrimeHead',
  CASE_STATUS_MASTER: 'CaseStatusMaster',
  EMPLOYEE: 'Employee'
};

const COLUMNS = {
  [TABLES.CASE_MASTER]: {
    CASE_MASTER_ID: 'CaseMasterID',
    CRIME_NO: 'CrimeNo',
    CASE_NO: 'CaseNo',
    CRIME_REGISTERED_DATE: 'CrimeRegisteredDate',
    BRIEF_FACTS: 'BriefFacts',
    POLICE_PERSON_ID: 'PolicePersonID',
    POLICE_STATION_ID: 'PoliceStationID',
    CRIME_MAJOR_HEAD_ID: 'CrimeMajorHeadID',
    CASE_STATUS_ID: 'CaseStatusID',
    COURT_ID: 'CourtID'
  },
  [TABLES.COURT]: { COURT_ID: 'CourtID' },
  [TABLES.UNIT]: { UNIT_ID: 'UnitID' },
  [TABLES.CRIME_HEAD]: { CRIME_HEAD_ID: 'CrimeHeadID' },
  [TABLES.CASE_STATUS_MASTER]: { CASE_STATUS_ID: 'CaseStatusID' },
  [TABLES.EMPLOYEE]: { EMPLOYEE_ID: 'EmployeeID' }
};

class CaseRepository {
  constructor(zcql) {
    this.zcql = zcql;
  }

  /**
   * Helper to execute ZCQL.
   */
  async executeZCQL(query) {
    try {
      return await this.zcql.executeZCQLQuery(query);
    } catch (error) {
      console.error('[CaseRepository] ZCQL Error:', error.message, '| Query:', query);
      throw error;
    }
  }

  /**
   * Flattens the nested Zoho ZCQL JSON structure.
   */
  flattenRow(row) {
    if (!row) return null;
    let flattened = {};
    for (const [tableName, columns] of Object.entries(row)) {
      flattened = { ...flattened, ...columns };
    }
    return flattened;
  }

  /**
   * Find a complete Case/FIR record matching search identifiers.
   * Joins max 4 tables as per Catalyst limits, then does lookup queries.
   */
  async findCase(searchParams) {
    const { caseID, crimeNumber, firNumber, date, keyword } = searchParams;
    
    let filterClause = '';
    if (caseID) {
      const numVal = Number(caseID);
      const isBigId = isNaN(numVal) || numVal > 999999999 || numVal < -999999999;
      if (isBigId) {
        filterClause = `ROWID = '${caseID}'`;
      } else {
        filterClause = `(${COLUMNS[TABLES.CASE_MASTER].CASE_MASTER_ID} = ${caseID} OR ROWID = '${caseID}')`;
      }
    } else if (crimeNumber) {
      filterClause = `${COLUMNS[TABLES.CASE_MASTER].CRIME_NO} = '${crimeNumber.replace(/'/g, "''")}'`;
    } else if (firNumber) {
      filterClause = `${COLUMNS[TABLES.CASE_MASTER].CASE_NO} = '${firNumber.replace(/'/g, "''")}'`;
    } else if (date) {
      filterClause = `${COLUMNS[TABLES.CASE_MASTER].CRIME_REGISTERED_DATE} = '${date.replace(/'/g, "''")}'`;
    } else if (keyword) {
      filterClause = `${COLUMNS[TABLES.CASE_MASTER].BRIEF_FACTS} LIKE '%${keyword.replace(/'/g, "''")}%'`;
    }

    if (!filterClause) return null;

    // QUERY 1: Base query on CaseMaster
    const baseQuery = `
      SELECT * FROM ${TABLES.CASE_MASTER}
      WHERE ${filterClause}
      LIMIT 1
    `;

    const rawRows = await this.executeZCQL(baseQuery);
    if (!rawRows || rawRows.length === 0) return null;

    const caseRecord = this.flattenRow(rawRows[0]);
    const cmRecord = rawRows[0].CaseMaster || {};

    // Lookup Unit
    if (cmRecord.PoliceStationID) {
      const unitQ = `SELECT * FROM ${TABLES.UNIT} WHERE ROWID = '${cmRecord.PoliceStationID}'`;
      const units = await this.executeZCQL(unitQ);
      if (units.length > 0) caseRecord.Unit = units[0].Unit;
    }

    // Lookup CaseStatusMaster
    if (cmRecord.CaseStatusID) {
      const statusQ = `SELECT * FROM ${TABLES.CASE_STATUS_MASTER} WHERE ROWID = '${cmRecord.CaseStatusID}'`;
      const statuses = await this.executeZCQL(statusQ);
      if (statuses.length > 0) caseRecord.CaseStatusMaster = statuses[0].CaseStatusMaster;
    }

    // Lookup Employee
    if (cmRecord.PolicePersonID) {
      const empQ = `SELECT * FROM ${TABLES.EMPLOYEE} WHERE ROWID = '${cmRecord.PolicePersonID}'`;
      const emps = await this.executeZCQL(empQ);
      if (emps.length > 0) caseRecord.Employee = emps[0].Employee;
    }

    // Lookup Court
    if (cmRecord.CourtID) {
      const courtQ = `SELECT * FROM ${TABLES.COURT} WHERE ROWID = '${cmRecord.CourtID}'`;
      const courts = await this.executeZCQL(courtQ);
      if (courts.length > 0) caseRecord.Court = courts[0].Court;
    }

    // QUERY 2: Resolve District (from Unit or Employee)
    const districtId = caseRecord.Unit?.DistrictID || caseRecord.Employee?.DistrictID;
    if (districtId) {
      const distQuery = `SELECT * FROM District WHERE ROWID = '${districtId}'`;
      const dists = await this.executeZCQL(distQuery);
      if (dists.length > 0) {
        caseRecord.District = dists[0].District;
      }
    }

    // QUERY 3: Resolve CrimeHead
    if (cmRecord.CrimeMajorHeadID) {
      const headQuery = `SELECT * FROM ${TABLES.CRIME_HEAD} WHERE ROWID = '${cmRecord.CrimeMajorHeadID}'`;
      const heads = await this.executeZCQL(headQuery);
      if (heads.length > 0) {
        caseRecord.CrimeHead = heads[0].CrimeHead;
      }
    }

    // QUERY 4: Resolve GravityOffence
    if (cmRecord.GravityOffenceID) {
      const gravityQuery = `SELECT * FROM GravityOffence WHERE ROWID = '${cmRecord.GravityOffenceID}'`;
      const gravities = await this.executeZCQL(gravityQuery);
      if (gravities.length > 0) {
        caseRecord.GravityOffence = gravities[0].GravityOffence;
      }
    }

    return caseRecord;
  }
}

module.exports = CaseRepository;
