/**
 * Standard API Response Utility.
 * Enforces uniform output format for all ForenSight REST endpoints.
 */

class ResponseUtil {
  /**
   * Generates a successful response object.
   * 
   * @param {any} data - Query response payload (object or array)
   * @param {string} [message='Success'] - User-friendly context message
   * @param {object|null} [pagination=null] - Pagination details { page, limit, total }
   * @returns {object} Standardized response object
   */
  static success(data, message = 'Success', pagination = null) {
    return {
      success: true,
      message,
      data,
      pagination: pagination ? {
        page: parseInt(pagination.page, 10),
        limit: parseInt(pagination.limit, 10),
        total: parseInt(pagination.total, 10)
      } : null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generates an error response object.
   * 
   * @param {string} message - User-friendly error text
   * @param {string} code - Machine-readable error identifier string
   * @param {any} [details=null] - Additional validation or diagnostic details
   * @returns {object} Standardized response object
   */
  static error(message, code = 'INTERNAL_SERVER_ERROR', details = null) {
    return {
      success: false,
      message,
      data: null,
      error: {
        code,
        details
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ResponseUtil;
