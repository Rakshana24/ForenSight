/**
 * Crime Service Layer.
 * Implements business logical validations, joins orchestrations, and DTO mappings.
 */

const CaseRepository = require('../repositories/caseRepository');
const CaseResponseDTO = require('../shared/dto/caseDTO');
const { validateCaseSearchInput } = require('../shared/validators/commonValidator');
const { sanitizeString } = require('../shared/middleware/security');
const { NotFoundError } = require('../shared/middleware/errorSystem');

class CrimeService {
  /**
   * @param {object} catalystApp - Initialized Zoho Catalyst Application instance
   */
  constructor(catalystApp) {
    if (!catalystApp) {
      throw new Error('CrimeService requires an initialized Catalyst App instance.');
    }
    this.app = catalystApp;
    this.caseRepository = new CaseRepository(catalystApp);
  }

  /**
   * Orchestrates FIR retrieval by ID, Crime Number, or Case Number.
   * 
   * @param {object} rawParams - Raw query parameters { caseMasterId, crimeNo, caseNo }
   * @returns {Promise<object>} Parsed CaseResponseDTO object
   * @throws {NotFoundError} If record is not found
   * @throws {ValidationError} If input arguments are malformed
   */
  async searchFIR(rawParams) {
    // 1. Sanitize string inputs
    const sanitizedParams = {
      caseMasterId: rawParams.caseMasterId,
      crimeNo: rawParams.crimeNo ? sanitizeString(rawParams.crimeNo) : undefined,
      caseNo: rawParams.caseNo ? sanitizeString(rawParams.caseNo) : undefined
    };

    // 2. Validate input parameters
    const validatedParams = validateCaseSearchInput(sanitizedParams);

    // 3. Database fetch
    const caseRecord = await this.caseRepository.findCase(validatedParams);
    if (!caseRecord) {
      const searchCriteria = Object.entries(validatedParams)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      throw new NotFoundError(`FIR Record matching criteria [${searchCriteria}] was not found.`);
    }

    // 4. Decouple database record structure into API response contract
    return CaseResponseDTO.fromRow(caseRecord);
  }
}

module.exports = CrimeService;
