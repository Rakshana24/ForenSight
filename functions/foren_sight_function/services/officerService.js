/**
 * Police Officer Service Layer.
 * Implements business logical validations, data mappings, and DTO orchestration for Officer Search.
 */

const OfficerRepository = require('../repositories/officerRepository');
const OfficerResponseDTO = require('../shared/dto/officerDTO');
const { validatePositiveInt } = require('../shared/validators/commonValidator');
const { sanitizeString } = require('../shared/middleware/security');
const { ValidationError, NotFoundError } = require('../shared/middleware/errorSystem');

class OfficerService {
  /**
   * @param {object} catalystApp - Initialized Zoho Catalyst Application instance
   */
  constructor(catalystApp) {
    if (!catalystApp) {
      throw new Error('OfficerService requires an initialized Catalyst App instance.');
    }
    this.app = catalystApp;
    this.officerRepository = new OfficerRepository(catalystApp);
  }

  /**
   * Validates and sanitizes officer search input.
   * 
   * @param {object} rawParams - Raw parameters
   * @returns {object} Validated and sanitized parameters
   */
  validateSearchInput(rawParams) {
    console.log("=== SERVICE / VALIDATION LAYER ===");
    console.log("Received Raw Params:", JSON.stringify(rawParams));

    // Normalize keys and filter out null/undefined/empty string placeholders
    const params = {};
    if (rawParams) {
      Object.keys(rawParams).forEach(key => {
        const val = rawParams[key];
        if (val === 'undefined' || val === 'null' || val === 'NaN' || val === '' || val === undefined || val === null) {
          return;
        }
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'employeeid') {
          params.employeeId = val;
        } else if (lowerKey === 'kgid') {
          params.kgid = val;
        } else if (lowerKey === 'firstname') {
          params.firstName = val;
        } else {
          params[key] = val;
        }
      });
    }

    console.log("Normalized Params:", JSON.stringify(params));

    const { employeeId, kgid, firstName } = params;

    if (!employeeId && !kgid && !firstName) {
      throw new ValidationError("At least one search parameter ('employeeId', 'kgid', or 'firstName') is required.");
    }

    const validated = {};

    if (employeeId) {
      validated.employeeId = validatePositiveInt(employeeId, 'employeeId');
    }

    if (kgid) {
      const sanitized = sanitizeString(kgid);
      if (!/^[a-zA-Z0-9-]{1,20}$/.test(sanitized)) {
        throw new ValidationError("Parameter 'kgid' must be a valid alphanumeric string.");
      }
      validated.kgid = sanitized;
    }

    if (firstName) {
      const sanitized = sanitizeString(firstName);
      if (!sanitized || sanitized.length < 2) {
        throw new ValidationError("Parameter 'firstName' must be a string containing at least 2 characters.");
      }
      validated.firstName = sanitized;
    }

    console.log("Validated Search Parameters:", JSON.stringify(validated));
    return validated;
  }

  /**
   * Service handler to search for an officer profile.
   * 
   * @param {object} rawParams - Raw query parameters from controller
   * @returns {Promise<object>} Consolidated Police Officer Profile DTO
   */
  async searchOfficer(rawParams) {
    // 1. Validate and sanitize inputs
    const validatedParams = this.validateSearchInput(rawParams);

    // 2. Fetch profile from database repository
    const profileData = await this.officerRepository.findOfficer(validatedParams);

    if (!profileData || !profileData.employeeRecord) {
      const searchCriteria = Object.entries(validatedParams)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      throw new NotFoundError(`Police Officer Profile matching criteria [${searchCriteria}] was not found.`);
    }

    // 3. Transform database objects to API response DTO contract
    return OfficerResponseDTO.fromProfile(profileData);
  }
}

module.exports = OfficerService;
