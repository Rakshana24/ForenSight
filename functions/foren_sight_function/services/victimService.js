/**
 * Victim Service Layer.
 * Implements business logical validations, data mappings, and DTO orchestration for Victim Search.
 */

const VictimRepository = require('../repositories/victimRepository');
const VictimResponseDTO = require('../shared/dto/victimDTO');
const { validatePositiveInt } = require('../shared/validators/commonValidator');
const { sanitizeString } = require('../shared/middleware/security');
const { ValidationError, NotFoundError } = require('../shared/middleware/errorSystem');

class VictimService {
  /**
   * @param {object} catalystApp - Initialized Zoho Catalyst Application instance
   */
  constructor(catalystApp) {
    if (!catalystApp) {
      throw new Error('VictimService requires an initialized Catalyst App instance.');
    }
    this.app = catalystApp;
    this.victimRepository = new VictimRepository(catalystApp);
  }

  /**
   * Validates and sanitizes victim search input.
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
        if (lowerKey === 'victimmasterid') {
          params.victimMasterId = val;
        } else if (lowerKey === 'victimname') {
          params.victimName = val;
        } else {
          params[key] = val;
        }
      });
    }

    console.log("Normalized Params:", JSON.stringify(params));

    const { victimMasterId, victimName } = params;

    if (!victimMasterId && !victimName) {
      throw new ValidationError("At least one search parameter ('victimMasterId' or 'victimName') is required.");
    }

    const validated = {};

    if (victimMasterId) {
      validated.victimMasterId = validatePositiveInt(victimMasterId, 'victimMasterId');
    }

    if (victimName) {
      const sanitized = sanitizeString(victimName);
      if (!sanitized || sanitized.length < 2) {
        throw new ValidationError("Parameter 'victimName' must be a string containing at least 2 characters.");
      }
      validated.victimName = sanitized;
    }

    console.log("Validated Search Parameters:", JSON.stringify(validated));
    return validated;
  }

  /**
   * Service handler to search for a victim profile.
   * 
   * @param {object} rawParams - Raw query parameters from controller
   * @returns {Promise<object>} Consolidated Victim Profile DTO
   */
  async searchVictim(rawParams) {
    // 1. Validate and sanitize inputs
    const validatedParams = this.validateSearchInput(rawParams);

    // 2. Fetch profile from database repository
    const profileData = await this.victimRepository.findVictim(validatedParams);

    if (!profileData || !profileData.victimRecord) {
      const searchCriteria = Object.entries(validatedParams)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      throw new NotFoundError(`Victim Profile matching criteria [${searchCriteria}] was not found.`);
    }

    // 3. Transform database objects to API response DTO contract
    return VictimResponseDTO.fromProfile(profileData);
  }
}

module.exports = VictimService;
