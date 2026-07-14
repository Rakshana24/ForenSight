const TABLES = {
  VICTIM: 'Victim'
};

const COLUMNS = {
  [TABLES.VICTIM]: {
    VICTIM_MASTER_ID: 'VictimMasterID',
    VICTIM_NAME: 'VictimName',
    CASE_MASTER_ID: 'CaseMasterID'
  }
};

class VictimRepository {
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
      console.error('[VictimRepository] ZCQL Error:', error.message, '| Query:', query);
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
   * Find Victim records matching search identifiers.
   */
  async findVictim(searchParams) {
    const { victimID, victimName, caseID } = searchParams;
    
    let filterClause = '';
    if (victimID) {
      filterClause = `${COLUMNS[TABLES.VICTIM].VICTIM_MASTER_ID} = '${victimID.replace(/'/g, "''")}'`;
    } else if (victimName) {
      filterClause = `${COLUMNS[TABLES.VICTIM].VICTIM_NAME} = '${victimName.replace(/'/g, "''")}'`;
    } else if (caseID) {
      filterClause = `${COLUMNS[TABLES.VICTIM].CASE_MASTER_ID} = '${caseID.replace(/'/g, "''")}'`;
    }

    if (!filterClause) return [];

    const baseQuery = `
      SELECT * FROM ${TABLES.VICTIM}
      WHERE ${filterClause}
    `;

    const rawRows = await this.executeZCQL(baseQuery);
    if (!rawRows || rawRows.length === 0) return [];

    return rawRows.map(row => this.flattenRow(row));
  }
}

module.exports = VictimRepository;
