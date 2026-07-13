/**
 * Data Transfer Object (DTO) for Accused/Criminal responses.
 * Decouples raw Zoho Catalyst Data Store schemas from the API response format.
 */

class AccusedResponseDTO {
  /**
   * Transforms merged database results into a clean, typed Criminal Profile object.
   * 
   * @param {object} profileData - Merged data object containing accused record and associated cases/arrests
   * @returns {object|null} Transformed Criminal Profile DTO
   */
  static fromProfile(profileData) {
    if (!profileData) return null;

    const { accusedRecord, relatedCases, arrestHistory } = profileData;
    if (!accusedRecord) return null;

    // Map Gender ID to string representation
    let genderName = 'Unknown';
    if (accusedRecord.GenderID === 1 || accusedRecord.GenderID === '1') {
      genderName = 'Male';
    } else if (accusedRecord.GenderID === 2 || accusedRecord.GenderID === '2') {
      genderName = 'Female';
    }

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
    let previousCases = 0;

    cases.forEach(c => {
      if (c.status && c.status.toLowerCase().includes('closed')) {
        previousCases++;
      } else {
        activeCases++;
      }
    });

    // Map arrest/surrender history
    const arrests = (arrestHistory || []).map(a => {
      const arr = a.ArrestSurrender || {};
      const station = a.Unit || {};
      const court = a.Court || {};

      let typeStr = 'Unknown';
      if (arr.ArrestSurrenderTypeID === 1 || arr.ArrestSurrenderTypeID === '1') {
        typeStr = 'Arrest';
      } else if (arr.ArrestSurrenderTypeID === 2 || arr.ArrestSurrenderTypeID === '2') {
        typeStr = 'Surrender';
      }

      return {
        arrestSurrenderId: arr.ArrestSurrenderID ? parseInt(arr.ArrestSurrenderID, 10) : null,
        type: typeStr,
        date: arr.ArrestSurrenderDate || null,
        policeStationName: station.UnitName || null,
        courtName: court.CourtName || null
      };
    });

    return {
      accusedName: accusedRecord.AccusedName || null,
      age: accusedRecord.AgeYear ? parseInt(accusedRecord.AgeYear, 10) : null,
      gender: genderName,
      personId: accusedRecord.PersonID || null,
      summary: {
        totalCases,
        activeCases,
        previousCases
      },
      cases,
      arrestHistory: arrests
    };
  }
}

module.exports = AccusedResponseDTO;
