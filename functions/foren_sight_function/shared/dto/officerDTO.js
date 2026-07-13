/**
 * Data Transfer Object (DTO) for Police Officer/Employee responses.
 * Decouples raw Zoho Catalyst Data Store schemas from the API response format.
 */

class OfficerResponseDTO {
  /**
   * Transforms merged database results into a clean, typed Police Officer Profile object.
   * 
   * @param {object} profileData - Merged data object containing employee record and associated cases
   * @returns {object|null} Transformed Police Officer Profile DTO
   */
  static fromProfile(profileData) {
    if (!profileData) return null;

    const { employeeRecord, rankRecord, designationRecord, unitRecord, districtRecord, relatedCases } = profileData;
    if (!employeeRecord) return null;

    // Map cases list
    const cases = (relatedCases || []).map(c => {
      const cm = c.CaseMaster || {};
      const status = c.CaseStatusMaster || {};
      return {
        caseMasterId: cm.CaseMasterID ? parseInt(cm.CaseMasterID, 10) : null,
        crimeNumber: cm.CrimeNo || null,
        caseNumber: cm.CaseNo || null,
        briefFacts: cm.BriefFacts || null,
        status: status.CaseStatusName || 'Unknown',
        registeredDate: cm.CrimeRegisteredDate || null
      };
    });

    // Compute summaries based on case status name
    const totalCases = cases.length;
    let activeCases = 0;
    let closedCases = 0;

    cases.forEach(c => {
      if (c.status && c.status.toLowerCase().includes('closed')) {
        closedCases++;
      } else {
        activeCases++;
      }
    });

    return {
      employeeId: employeeRecord.EmployeeID ? parseInt(employeeRecord.EmployeeID, 10) : null,
      kgid: employeeRecord.KGID || null,
      firstName: employeeRecord.FirstName || null,
      rank: rankRecord.RankName || 'Unknown',
      designation: designationRecord.DesignationName || 'Unknown',
      policeStationName: unitRecord.UnitName || 'Unknown',
      districtName: districtRecord.DistrictName || 'Unknown',
      summary: {
        totalCases,
        activeCases,
        closedCases
      },
      cases
    };
  }
}

module.exports = OfficerResponseDTO;
