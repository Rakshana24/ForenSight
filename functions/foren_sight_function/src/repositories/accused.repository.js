const TABLES = {
  ACCUSED: 'Accused'
};

const COLUMNS = {
  [TABLES.ACCUSED]: {
    ACCUSED_MASTER_ID: 'AccusedMasterID',
    ACCUSED_NAME: 'AccusedName',
    CASE_MASTER_ID: 'CaseMasterID'
  }
};

class AccusedRepository {
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
      console.error('[AccusedRepository] ZCQL Error:', error.message, '| Query:', query);
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
   * Find Accused records matching search identifiers.
   */
  async findAccused(searchParams) {
    const { accusedID, accusedName, caseID } = searchParams;
    
    let filterClause = '';
    if (accusedID) {
      filterClause = `${COLUMNS[TABLES.ACCUSED].ACCUSED_MASTER_ID} = '${accusedID.replace(/'/g, "''")}'`;
    } else if (accusedName) {
      filterClause = `${COLUMNS[TABLES.ACCUSED].ACCUSED_NAME} = '${accusedName.replace(/'/g, "''")}'`;
    } else if (caseID) {
      filterClause = `${COLUMNS[TABLES.ACCUSED].CASE_MASTER_ID} = '${caseID.replace(/'/g, "''")}'`;
    }

    if (!filterClause) return [];

    const baseQuery = `
      SELECT * FROM ${TABLES.ACCUSED}
      WHERE ${filterClause}
    `;

    const rawRows = await this.executeZCQL(baseQuery);
    if (!rawRows || rawRows.length === 0) return [];

    return rawRows.map(row => this.flattenRow(row));
  }
}

module.exports = AccusedRepository;
