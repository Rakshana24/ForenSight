/**
 * Base Repository Class.
 * Standardizes database operations using the Zoho Catalyst SDK and wraps error states.
 */

const { DatabaseError } = require('../shared/middleware/errorSystem');

class BaseRepository {
  /**
   * @param {object} catalystApp - Initialized Catalyst app instance
   */
  constructor(catalystApp) {
    if (!catalystApp) {
      throw new Error('BaseRepository requires an initialized Catalyst App instance.');
    }
    this.app = catalystApp;
    this.datastore = catalystApp.datastore();
  }

  /**
   * Executes a ZCQL query and wraps any exceptions in a standard DatabaseError.
   * 
   * @param {string} query - ZCQL query string to execute
   * @returns {Promise<Array<object>>} Raw result rows from Catalyst Data Store
   * @throws {DatabaseError} If query fails
   */
  async executeZCQL(query) {
    try {
      const zcqlInstance = this.app.zcql();
      const results = await zcqlInstance.executeZCQLQuery(query);
      return results || [];
    } catch (error) {
      throw new DatabaseError(`ZCQL Execution failed: ${error.message}`, {
        query,
        originalError: error
      });
    }
  }

  /**
   * Flattens Zoho Catalyst ZCQL nested row structures.
   * Transforms [{ TableA: { id: 1 }, TableB: { name: 'X' } }] into [{ id: 1, name: 'X' }]
   * while retaining full TableName_ColumnName mappings for naming collisions.
   * 
   * @param {object} row - Raw nested table row object
   * @returns {object|null} Flattened key-value record
   */
  flattenRow(row) {
    if (!row) return null;
    
    const flattened = {};
    for (const tableName of Object.keys(row)) {
      const tableData = row[tableName];
      
      if (typeof tableData === 'object' && tableData !== null) {
        for (const colName of Object.keys(tableData)) {
          // Pre-populate both namesspaced and plain column keys
          const namespacedKey = `${tableName}_${colName}`;
          flattened[namespacedKey] = tableData[colName];
          
          if (flattened[colName] === undefined) {
            flattened[colName] = tableData[colName];
          }
        }
      } else {
        // Handle un-nested scalars (e.g., SELECT COUNT(ROWID) or raw aliased columns)
        flattened[tableName] = tableData;
      }
    }
    return flattened;
  }

  /**
   * Utility to flatten multiple rows.
   * 
   * @param {Array<object>} rows - List of raw nested row records
   * @returns {Array<object>} List of flattened records
   */
  flattenRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => this.flattenRow(row)).filter(Boolean);
  }
}

module.exports = BaseRepository;
