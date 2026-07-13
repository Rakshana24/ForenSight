/**
 * Data Transfer Object (DTO) for Victim responses.
 * Decouples raw Zoho Catalyst Data Store schemas from the API response format.
 */

class VictimResponseDTO {
  /**
   * Transforms merged database results into a clean, typed Victim Profile object.
   * 
   * @param {object} profileData - Merged data object containing victim record and associated cases
   * @returns {object|null} Transformed Victim Profile DTO
   */
  static fromProfile(profileData) {
    if (!profileData) return null;

    const { victimRecord, relatedCases } = profileData;
    if (!victimRecord) return null;

    // Map Gender ID to string representation
    let genderName = 'Unknown';
    if (victimRecord.GenderID === 1 || victimRecord.GenderID === '1') {
      genderName = 'Male';
    } else if (victimRecord.GenderID === 2 || victimRecord.GenderID === '2') {
      genderName = 'Female';
    }

    // Map VictimPolice to boolean
    const isPolice = victimRecord.VictimPolice === 1 || victimRecord.VictimPolice === '1' || victimRecord.VictimPolice === true;

    // Map cases list
    const cases = (relatedCases || []).map(c => {
      const cm = c.CaseMaster || {};
      const status = c.CaseStatusMaster || {};
      const unit = c.Unit || {};
      const court = c.Court || {};
      return {
        caseMasterId: cm.CaseMasterID ? parseInt(cm.CaseMasterID, 10) : null,
        crimeNumber: cm.CrimeNo || null,
        caseNumber: cm.CaseNo || null,
        briefFacts: cm.BriefFacts || null,
        status: status.CaseStatusName || 'Unknown',
        registeredDate: cm.CrimeRegisteredDate || null,
        policeStationName: unit.UnitName || null,
        courtName: court.CourtName || null
      };
    });

    return {
      victimName: victimRecord.VictimName || null,
      age: victimRecord.AgeYear ? parseInt(victimRecord.AgeYear, 10) : null,
      gender: genderName,
      isPolice,
      summary: {
        totalCases: cases.length
      },
      cases
    };
  }
}

module.exports = VictimResponseDTO;
