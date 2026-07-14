const TABLES = {
  UNIT: 'Unit'
};

const COLUMNS = {
  [TABLES.UNIT]: {
    UNIT_ID: 'UnitID',
    UNIT_NAME: 'UnitName'
  }
};

class UnitRepository {
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
      console.error('[UnitRepository] ZCQL Error:', error.message, '| Query:', query);
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
   * Find Unit records matching search identifiers.
   */
  async findUnit(searchParams) {
    const { unitID, unitName } = searchParams;
    
    let filterClause = '';
    if (unitID) {
      filterClause = `${COLUMNS[TABLES.UNIT].UNIT_ID} = '${unitID.replace(/'/g, "''")}'`;
    } else if (unitName) {
      filterClause = `${COLUMNS[TABLES.UNIT].UNIT_NAME} = '${unitName.replace(/'/g, "''")}'`;
    }

    if (!filterClause) return [];

    const baseQuery = `
      SELECT * FROM ${TABLES.UNIT}
      WHERE ${filterClause}
    `;

    const rawRows = await this.executeZCQL(baseQuery);
    if (!rawRows || rawRows.length === 0) return [];

    return rawRows.map(row => this.flattenRow(row));
  }
}

module.exports = UnitRepository;
