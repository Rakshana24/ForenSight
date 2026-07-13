/**
 * Accused Service Layer.
 * Implements business logical validations, data mappings, and DTO orchestration for Criminal Search.
 */

const AccusedRepository = require('../repositories/accusedRepository');
const AccusedResponseDTO = require('../shared/dto/accusedDTO');
const { validatePositiveInt } = require('../shared/validators/commonValidator');
const { sanitizeString } = require('../shared/middleware/security');
const { ValidationError, NotFoundError } = require('../shared/middleware/errorSystem');

class AccusedService {
  /**
   * @param {object} catalystApp - Initialized Zoho Catalyst Application instance
   */
  constructor(catalystApp) {
    if (!catalystApp) {
      throw new Error('AccusedService requires an initialized Catalyst App instance.');
    }
    this.app = catalystApp;
    this.accusedRepository = new AccusedRepository(catalystApp);
  }

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
        if (lowerKey === 'accusedmasterid') {
          params.accusedMasterId = val;
        } else if (lowerKey === 'accusedname') {
          params.accusedName = val;
        } else if (lowerKey === 'personid') {
          params.personId = val;
        } else {
          params[key] = val;
        }
      });
    }

    console.log("Normalized Params:", JSON.stringify(params));

    const { accusedMasterId, accusedName, personId } = params;

    if (!accusedMasterId && !accusedName && !personId) {
      throw new ValidationError("At least one search parameter ('accusedMasterId', 'accusedName', or 'personId') is required.");
    }

    const validated = {};

    if (accusedMasterId) {
      validated.accusedMasterId = validatePositiveInt(accusedMasterId, 'accusedMasterId');
    }

    if (accusedName) {
      const sanitized = sanitizeString(accusedName);
      if (!sanitized || sanitized.length < 2) {
        throw new ValidationError("Parameter 'accusedName' must be a string containing at least 2 characters.");
      }
      validated.accusedName = sanitized;
    }

    if (personId) {
      const sanitized = sanitizeString(personId);
      if (!/^[a-zA-Z0-9-]{1,20}$/.test(sanitized)) {
        throw new ValidationError("Parameter 'personId' must be a valid alphanumeric string.");
      }
      validated.personId = sanitized;
    }

    console.log("Validated Search Parameters:", JSON.stringify(validated));
    return validated;
  }

  /**
   * Service handler to search for a criminal profile.
   * 
   * @param {object} rawParams - Raw query parameters from controller
   * @returns {Promise<object>} Consolidated Criminal Profile DTO
   */
  async searchCriminal(rawParams) {
    // 1. Validate and sanitize inputs
    const validatedParams = this.validateSearchInput(rawParams);

    // 2. Fetch profile from database repository
    const profileData = await this.accusedRepository.findCriminal(validatedParams);

    if (!profileData || !profileData.accusedRecord) {
      const searchCriteria = Object.entries(validatedParams)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      throw new NotFoundError(`Criminal Profile matching criteria [${searchCriteria}] was not found.`);
    }

    // 3. Transform database objects to API response DTO contract
    return AccusedResponseDTO.fromProfile(profileData);
  }
}

module.exports = AccusedService;
