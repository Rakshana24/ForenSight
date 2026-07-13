/**
 * Database Table and Column Constants for ForenSight Platform
 * Maps exactly to the Zoho Catalyst Data Store schemas.
 */

const TABLES = {
  CASE_MASTER: 'CaseMaster',
  COURT: 'Court',
  UNIT: 'Unit',
  CRIME_HEAD: 'CrimeHead',
  CRIME_SUB_HEAD: 'CrimeSubHead',
  CASE_STATUS_MASTER: 'CaseStatusMaster',
  EMPLOYEE: 'Employee',
  ACT_SECTION_ASSOCIATION: 'ActSectionAssociation',
  ACT: 'Act',
  SECTION: 'Section',
  ACCUSED: 'Accused',
  VICTIM: 'Victim',
  ARREST_SURRENDER: 'ArrestSurrender'
};

const COLUMNS = {
  [TABLES.CASE_MASTER]: {
    CASE_MASTER_ID: 'CaseMasterID',
    CRIME_NO: 'CrimeNo',
    CASE_NO: 'CaseNo',
    CRIME_REGISTERED_DATE: 'CrimeRegisteredDate',
    POLICE_PERSON_ID: 'PolicePersonID',
    POLICE_STATION_ID: 'PoliceStationID',
    CASE_CATEGORY_ID: 'CaseCategoryID',
    GRAVITY_OFFENCE_ID: 'GravityOffenceID',
    CRIME_MAJOR_HEAD_ID: 'CrimeMajorHeadID',
    CRIME_MINOR_HEAD_ID: 'CrimeMinorHeadID',
    CASE_STATUS_ID: 'CaseStatusID',
    COURT_ID: 'CourtID',
    INCIDENT_FROM_DATE: 'IncidentFromDate',
    INCIDENT_TO_DATE: 'IncidentToDate',
    INFO_RECEIVED_PS_DATE: 'InfoReceivedPSDate',
    LATITUDE: 'latitude',
    LONGITUDE: 'longitude',
    BRIEF_FACTS: 'BriefFacts'
  },
  [TABLES.COURT]: {
    COURT_ID: 'CourtID',
    COURT_NAME: 'CourtName',
    DISTRICT_ID: 'DistrictID',
    STATE_ID: 'StateID',
    ACTIVE: 'Active'
  },
  [TABLES.UNIT]: {
    UNIT_ID: 'UnitID',
    UNIT_NAME: 'UnitName',
    TYPE_ID: 'TypeID',
    PARENT_UNIT: 'ParentUnit',
    NATIONALITY_ID: 'NationalityID',
    STATE_ID: 'StateID',
    DISTRICT_ID: 'DistrictID',
    ACTIVE: 'Active'
  },
  [TABLES.CRIME_HEAD]: {
    CRIME_HEAD_ID: 'CrimeHeadID',
    CRIME_GROUP_NAME: 'CrimeGroupName',
    ACTIVE: 'Active'
  },
  [TABLES.CRIME_SUB_HEAD]: {
    CRIME_SUB_HEAD_ID: 'CrimeSubHeadID',
    CRIME_HEAD_ID: 'CrimeHeadID',
    CRIME_HEAD_NAME: 'CrimeHeadName', // Subhead text description
    SEQ_ID: 'SeqID'
  },
  [TABLES.CASE_STATUS_MASTER]: {
    CASE_STATUS_ID: 'CaseStatusID',
    CASE_STATUS_NAME: 'CaseStatusName'
  },
  [TABLES.EMPLOYEE]: {
    EMPLOYEE_ID: 'EmployeeID',
    DISTRICT_ID: 'DistrictID',
    UNIT_ID: 'UnitID',
    RANK_ID: 'RankID',
    DESIGNATION_ID: 'DesignationID',
    KGID: 'KGID',
    FIRST_NAME: 'FirstName',
    EMPLOYEE_DOB: 'EmployeeDOB',
    GENDER_ID: 'GenderID',
    BLOOD_GROUP_ID: 'BloodGroupID',
    PHYSICALLY_CHALLENGED: 'PhysicallyChallenged',
    APPOINTMENT_DATE: 'AppointmentDate'
  },
  [TABLES.ACT_SECTION_ASSOCIATION]: {
    CASE_MASTER_ID: 'CaseMasterID',
    ACT_ID: 'ActID',
    SECTION_ID: 'SectionID',
    ACT_ORDER_ID: 'ActOrderID',
    SECTION_ORDER_ID: 'SectionOrderID'
  },
  [TABLES.ACT]: {
    ACT_CODE: 'ActCode',
    ACT_DESCRIPTION: 'ActDescription',
    SHORT_NAME: 'ShortName',
    ACTIVE: 'Active'
  },
  [TABLES.SECTION]: {
    ACT_CODE: 'ActCode',
    SECTION_CODE: 'SectionCode',
    SECTION_DESCRIPTION: 'SectionDescription',
    ACTIVE: 'Active'
  }
};

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

module.exports = {
  TABLES,
  COLUMNS,
  PAGINATION
};
