/**
 * Common Input Validation Rules and Sanitization Helpers
 * Throws ValidationError for invalid formatting.
 */

const { ValidationError } = require('../middleware/errorSystem');
const { PAGINATION } = require('../constants/dbConstants');

/**
 * Validates that a value is a positive integer.
 * 
 * @param {any} val - Value to check
 * @param {string} paramName - Name of parameter for error reporting
 * @returns {number} The parsed integer
 */
function validatePositiveInt(val, paramName) {
  if (val === undefined || val === null || val === '') {
    throw new ValidationError(`Parameter '${paramName}' is required.`);
  }
  
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed <= 0 || parsed.toString() !== val.toString().trim()) {
    throw new ValidationError(`Parameter '${paramName}' must be a valid positive integer.`);
  }
  
  return parsed;
}

/**
 * Validates standard pagination parameters (page and limit).
 * 
 * @param {object} query - Query parameters object
 * @returns {object} Standardized parsed { page, limit }
 */
function validatePagination(query) {
  let page = PAGINATION.DEFAULT_PAGE;
  let limit = PAGINATION.DEFAULT_LIMIT;

  if (query.page !== undefined && query.page !== '') {
    const parsedPage = parseInt(query.page, 10);
    if (isNaN(parsedPage) || parsedPage <= 0) {
      throw new ValidationError("Parameter 'page' must be a positive integer.");
    }
    page = parsedPage;
  }

  if (query.limit !== undefined && query.limit !== '') {
    const parsedLimit = parseInt(query.limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new ValidationError("Parameter 'limit' must be a positive integer.");
    }
    if (parsedLimit > PAGINATION.MAX_LIMIT) {
      throw new ValidationError(`Parameter 'limit' cannot exceed max limit of ${PAGINATION.MAX_LIMIT}.`);
    }
    limit = parsedLimit;
  }

  return { page, limit };
}

/**
 * Validates dates in YYYY-MM-DD format.
 * 
 * @param {string} dateStr - Date string to check
 * @param {string} paramName - Name of parameter
 * @returns {string} Clean date string if valid
 */
function validateDate(dateStr, paramName) {
  if (!dateStr) return null;
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    throw new ValidationError(`Parameter '${paramName}' must be in YYYY-MM-DD format.`);
  }
  
  const timestamp = Date.parse(dateStr);
  if (isNaN(timestamp)) {
    throw new ValidationError(`Parameter '${paramName}' must be a valid calendar date.`);
  }
  
  return dateStr;
}

/**
 * Validates case/FIR search identifiers.
 * At least one of CaseMasterID, CrimeNo, or CaseNo must be present.
 * 
 * @param {object} params - Input params
 * @returns {object} Validated params
 */
function validateCaseSearchInput(params) {
  const { caseMasterId, crimeNo, caseNo } = params;
  
  if (!caseMasterId && !crimeNo && !caseNo) {
    throw new ValidationError("At least one search parameter ('caseMasterId', 'crimeNo', or 'caseNo') is required.");
  }
  
  const result = {};
  
  if (caseMasterId) {
    result.caseMasterId = validatePositiveInt(caseMasterId, 'caseMasterId');
  }
  
  if (crimeNo) {
    // Crime numbers are typically long numeric strings (e.g. 18 chars)
    const cleanCrimeNo = crimeNo.toString().trim();
    if (!/^\d{1,30}$/.test(cleanCrimeNo)) {
      throw new ValidationError("Parameter 'crimeNo' must be a numeric string.");
    }
    result.crimeNo = cleanCrimeNo;
  }
  
  if (caseNo) {
    // Case numbers are typically numeric or alphanumeric strings
    const cleanCaseNo = caseNo.toString().trim();
    if (!/^[a-zA-Z0-9-]{1,20}$/.test(cleanCaseNo)) {
      throw new ValidationError("Parameter 'caseNo' must be a valid alphanumeric case number string.");
    }
    result.caseNo = cleanCaseNo;
  }
  
  return result;
}

/**
 * Validates sorting parameters.
 * 
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Direction ASC/DESC
 * @param {Array<string>} allowedFields - Permitted fields for sorting
 * @returns {object} Clean { sortBy, sortOrder }
 */
function validateSorting(sortBy, sortOrder, allowedFields) {
  let cleanSortBy = allowedFields[0];
  let cleanSortOrder = 'DESC';

  if (sortBy) {
    if (!allowedFields.includes(sortBy)) {
      throw new ValidationError(`Parameter 'sortBy' must be one of: ${allowedFields.join(', ')}.`);
    }
    cleanSortBy = sortBy;
  }

  if (sortOrder) {
    const orderUpper = sortOrder.toString().toUpperCase().trim();
    if (orderUpper !== 'ASC' && orderUpper !== 'DESC') {
      throw new ValidationError("Parameter 'sortOrder' must be 'ASC' or 'DESC'.");
    }
    cleanSortOrder = orderUpper;
  }

  return { sortBy: cleanSortBy, sortOrder: cleanSortOrder };
}

module.exports = {
  validatePositiveInt,
  validatePagination,
  validateDate,
  validateCaseSearchInput,
  validateSorting
};
