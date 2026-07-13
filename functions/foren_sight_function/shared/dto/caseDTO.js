/**
 * Data Transfer Object (DTO) for Case/FIR responses.
 * Decouples raw Zoho Catalyst Data Store schemas from the API response format.
 */

class CaseResponseDTO {
  /**
   * Transforms a raw database join row into a clean, typed CaseResponse object.
   * Handles nested table namespaces returned by ZCQL.
   * 
   * @param {object} row - Raw row object containing CaseMaster and joined entities
   * @returns {object|null} Transformed Case/FIR DTO
   */
  static fromRow(row) {
    if (!row) return null;

    // Unpack table namespaces (handles standard ZCQL nested responses)
    const cm = row.CaseMaster || {};
    const court = row.Court || {};
    const unit = row.Unit || {};
    const head = row.CrimeHead || {};
    const subhead = row.CrimeSubHead || {};
    const status = row.CaseStatusMaster || {};
    const emp = row.Employee || {};
    const rank = row.Rank || {};
    const desig = row.Designation || {};

    return {
      caseMasterId: cm.CaseMasterID ? parseInt(cm.CaseMasterID, 10) : null,
      crimeNumber: cm.CrimeNo || null,
      caseNumber: cm.CaseNo || null,
      crimeRegisteredDate: cm.CrimeRegisteredDate || null,
      incidentFromDate: cm.IncidentFromDate || null,
      incidentToDate: cm.IncidentToDate || null,
      infoReceivedPSDate: cm.InfoReceivedPSDate || null,
      latitude: cm.latitude ? parseFloat(cm.latitude) : null,
      longitude: cm.longitude ? parseFloat(cm.longitude) : null,
      briefFacts: cm.BriefFacts || null,
      
      court: court.CourtID ? {
        courtId: parseInt(court.CourtID, 10),
        courtName: court.CourtName || null,
        districtId: court.DistrictID ? parseInt(court.DistrictID, 10) : null,
        stateId: court.StateID ? parseInt(court.StateID, 10) : null
      } : null,
      
      policeStation: unit.UnitID ? {
        stationId: parseInt(unit.UnitID, 10),
        stationName: unit.UnitName || null,
        districtId: unit.DistrictID ? parseInt(unit.DistrictID, 10) : null
      } : null,
      
      crimeHead: head.CrimeHeadID ? {
        crimeHeadId: parseInt(head.CrimeHeadID, 10),
        crimeGroupName: head.CrimeGroupName || null
      } : null,
      
      crimeSubHead: subhead.CrimeSubHeadID ? {
        crimeSubHeadId: parseInt(subhead.CrimeSubHeadID, 10),
        crimeSubHeadName: subhead.CrimeHeadName || null // Maps 'CrimeHeadName' column in CrimeSubHead table
      } : null,
      
      caseStatus: status.CaseStatusID ? {
        caseStatusId: parseInt(status.CaseStatusID, 10),
        caseStatusName: status.CaseStatusName || null
      } : null,
      
      investigatingOfficer: emp.EmployeeID ? {
        employeeId: parseInt(emp.EmployeeID, 10),
        firstName: emp.FirstName || null,
        kgid: emp.KGID || null,
        rank: rank.RankName || null,
        designation: desig.DesignationName || null
      } : null,

      actsAndSections: Array.isArray(row.actsAndSections) ? row.actsAndSections.map(as => ({
        actCode: as.actCode || null,
        sectionCode: as.sectionCode || null,
        description: as.description || null
      })) : []
    };
  }

  /**
   * Helper to format a paginated list of cases.
   * 
   * @param {Array<object>} rows - Array of raw rows
   * @returns {Array<object>} Array of Case/FIR DTOs
   */
  static fromRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => this.fromRow(row)).filter(Boolean);
  }
}

module.exports = CaseResponseDTO;
