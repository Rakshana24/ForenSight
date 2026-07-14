const TABLES = {
  COURT: 'Court'
};

const COLUMNS = {
  [TABLES.COURT]: {
    COURT_ID: 'CourtID',
    COURT_NAME: 'CourtName'
  }
};

class CourtRepository {
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
      console.error('[CourtRepository] ZCQL Error:', error.message, '| Query:', query);
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
   * Find Court records matching search identifiers.
   */
  async findCourt(searchParams) {
    const { courtID, courtName } = searchParams;
    
    let filterClause = '';
    if (courtID) {
      filterClause = `${COLUMNS[TABLES.COURT].COURT_ID} = '${courtID.replace(/'/g, "''")}'`;
    } else if (courtName) {
      filterClause = `${COLUMNS[TABLES.COURT].COURT_NAME} = '${courtName.replace(/'/g, "''")}'`;
    }

    if (!filterClause) return [];

    const baseQuery = `
      SELECT * FROM ${TABLES.COURT}
      WHERE ${filterClause}
    `;

    const rawRows = await this.executeZCQL(baseQuery);
    if (!rawRows || rawRows.length === 0) return [];

    return rawRows.map(row => this.flattenRow(row));
  }
}

module.exports = CourtRepository;
