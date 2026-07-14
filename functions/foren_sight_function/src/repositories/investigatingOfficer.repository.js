const TABLES = {
  CASE_MASTER: 'CaseMaster',
  EMPLOYEE: 'Employee'
};

const COLUMNS = {
  [TABLES.CASE_MASTER]: {
    CASE_MASTER_ID: 'CaseMasterID',
    CRIME_NO: 'CrimeNo',
    POLICE_PERSON_ID: 'PolicePersonID'
  },
  [TABLES.EMPLOYEE]: {
    EMPLOYEE_ID: 'EmployeeID',
    DISTRICT_ID: 'DistrictID',
    UNIT_ID: 'UnitID',
    RANK_ID: 'RankID',
    DESIGNATION_ID: 'DesignationID',
    KGID: 'KGID',
    FIRST_NAME: 'FirstName',
    GENDER_ID: 'GenderID'
  }
};

class InvestigatingOfficerRepository {
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
      console.error('[InvestigatingOfficerRepository] ZCQL Error:', error.message, '| Query:', query);
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
   * Find CaseMaster to extract PolicePersonID
   */
  async findCase(searchParams) {
    const { caseID, crimeNumber } = searchParams;
    
    let filterClause = '';
    if (caseID) {
      filterClause = `${COLUMNS[TABLES.CASE_MASTER].CASE_MASTER_ID} = '${caseID.replace(/'/g, "''")}'`;
    } else if (crimeNumber) {
      filterClause = `${COLUMNS[TABLES.CASE_MASTER].CRIME_NO} = '${crimeNumber.replace(/'/g, "''")}'`;
    }

    if (!filterClause) return null;

    const baseQuery = `
      SELECT CaseMasterID, CrimeNo, PolicePersonID FROM ${TABLES.CASE_MASTER}
      WHERE ${filterClause}
      LIMIT 1
    `;

    const rawRows = await this.executeZCQL(baseQuery);
    if (!rawRows || rawRows.length === 0) return null;

    return this.flattenRow(rawRows[0]);
  }

  /**
   * Find Employee using the ROWID passed from CaseMaster.PolicePersonID
   */
  async findEmployee(policePersonRowId) {
    if (!policePersonRowId) return null;
    
    const baseQuery = `
      SELECT EmployeeID, FirstName, KGID, RankID, DesignationID, DistrictID, UnitID, GenderID
      FROM ${TABLES.EMPLOYEE}
      WHERE ROWID = '${policePersonRowId}'
      LIMIT 1
    `;

    const rawRows = await this.executeZCQL(baseQuery);
    if (!rawRows || rawRows.length === 0) return null;

    return this.flattenRow(rawRows[0]);
  }
}

module.exports = InvestigatingOfficerRepository;
