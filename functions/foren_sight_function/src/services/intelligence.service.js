const CaseRepository = require('../repositories/case.repository');
const VictimRepository = require('../repositories/victim.repository');
const AccusedRepository = require('../repositories/accused.repository');

class IntelligenceService {
  constructor(zcql) {
    this.zcql = zcql;
    this.caseRepo = new CaseRepository(zcql);
    this.victimRepo = new VictimRepository(zcql);
    this.accusedRepo = new AccusedRepository(zcql);
  }

  /**
   * Helper to execute ZCQL.
   */
  async executeZCQL(query) {
    try {
      const rows = await this.zcql.executeZCQLQuery(query);
      return rows.map(r => this.caseRepo.flattenRow(r));
    } catch (error) {
      console.error('[IntelligenceService] ZCQL Error:', error.message, '| Query:', query);
      const err = new Error(`Database query error: ${error.message}`);
      err.statusCode = 500;
      throw err;
    }
  }

  /**
   * Search cases using universal identifiers
   */
  async searchCases(searchType, searchValue) {
    if (!searchType || !searchValue) return [];
    
    // Sanitize input
    const val = searchValue.replace(/'/g, "''").trim();
    if (!val) return [];

    let baseQuery = '';
    let rows = [];

    switch(searchType) {
      case 'Case ID':
        if (!isNaN(val)) {
          baseQuery = `SELECT ROWID, CaseMasterID, CrimeNo, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE CaseMasterID = ${val}`;
          rows = await this.executeZCQL(baseQuery);
        }
        if (rows.length === 0) {
          console.log(`[DEBUG] Case not found for Case ID: ${searchValue}`);
          const err = new Error(`No case found with Case ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        break;

      case 'Crime Number':
        baseQuery = `SELECT ROWID, CaseMasterID, CrimeNo, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE CrimeNo = '${val}'`;
        rows = await this.executeZCQL(baseQuery);
        if (rows.length === 0) {
          console.log(`[DEBUG] Case not found for Crime Number: ${searchValue}`);
          const err = new Error(`No case found with crime number ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        break;

      case 'Case Number':
        baseQuery = `SELECT ROWID, CaseMasterID, CrimeNo, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE CaseNo = '${val}'`;
        rows = await this.executeZCQL(baseQuery);
        if (rows.length === 0) {
          console.log(`[DEBUG] Case not found for Case Number: ${searchValue}`);
          const err = new Error(`No case found with case number ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        break;

      case 'Accused ID':
      case 'Person ID': {
        if (isNaN(val)) {
          const err = new Error(`No accused found with ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        const accRows = await this.executeZCQL(`SELECT CaseMasterID FROM Accused WHERE AccusedMasterID = ${val}`);
        if (accRows.length === 0) {
          console.log(`[DEBUG] Accused lookup returned no rows for ID: ${searchValue}`);
          const err = new Error(`No accused found with ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        const accIds = [...new Set(accRows.map(r => r.CaseMasterID).filter(Boolean))];
        if (accIds.length === 0) {
          console.log(`[DEBUG] Case not found for accused ID: ${searchValue}`);
          const err = new Error(`No case found linked with accused ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        const inClause = accIds.map(id => `'${id}'`).join(',');
        rows = await this.executeZCQL(`SELECT ROWID, CaseMasterID, CrimeNo, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE ROWID IN (${inClause})`);
        if (rows.length === 0) {
          console.log(`[DEBUG] Case not found`);
          const err = new Error(`No case found linked with accused ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        break;
      }

      case 'Victim ID': {
        if (isNaN(val)) {
          const err = new Error(`No victim found with ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        const vicRows = await this.executeZCQL(`SELECT CaseMasterID FROM Victim WHERE VictimMasterID = ${val}`);
        if (vicRows.length === 0) {
          console.log(`[DEBUG] Victim lookup returned no rows for ID: ${searchValue}`);
          const err = new Error(`No victim found with ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        const vicIds = [...new Set(vicRows.map(r => r.CaseMasterID).filter(Boolean))];
        if (vicIds.length === 0) {
          console.log(`[DEBUG] Case not found for victim ID: ${searchValue}`);
          const err = new Error(`No case found linked with victim ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        const inClause = vicIds.map(id => `'${id}'`).join(',');
        rows = await this.executeZCQL(`SELECT ROWID, CaseMasterID, CrimeNo, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE ROWID IN (${inClause})`);
        if (rows.length === 0) {
          console.log(`[DEBUG] Case not found`);
          const err = new Error(`No case found linked with victim ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        break;
      }

      case 'Employee ID':
      case 'Officer ID': {
        const empRows = await this.executeZCQL(`SELECT ROWID FROM Employee WHERE EmployeeID = '${val}'`);
        if (empRows.length === 0) {
          console.log(`[DEBUG] Officer lookup returned no rows for Employee ID: ${searchValue}`);
          const err = new Error(`No officer found with Employee ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        const empIds = [...new Set(empRows.map(r => r.ROWID).filter(Boolean))];
        const inClause = empIds.map(id => `'${id}'`).join(',');
        rows = await this.executeZCQL(`SELECT ROWID, CaseMasterID, CrimeNo, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE PolicePersonID IN (${inClause})`);
        if (rows.length === 0) {
          console.log(`[DEBUG] Case not found for officer: ${searchValue}`);
          const err = new Error(`No case found linked with officer ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        break;
      }

      case 'Officer Name': {
        const empRows = await this.executeZCQL(`SELECT ROWID FROM Employee WHERE FirstName = '${val}' OR FirstName LIKE '%${val}%'`);
        if (empRows.length === 0) {
          console.log(`[DEBUG] Officer lookup returned no rows for search value: ${searchValue}`);
          const err = new Error(`No officer found with name ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        console.log(`[DEBUG] Officer found: ${searchValue}`);
        const empIds = [...new Set(empRows.map(r => r.ROWID).filter(Boolean))];
        const inClause = empIds.map(id => `'${id}'`).join(',');
        rows = await this.executeZCQL(`SELECT ROWID, CaseMasterID, CrimeNo, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE PolicePersonID IN (${inClause})`);
        if (rows.length === 0) {
          console.log(`[DEBUG] Case not found for officer: ${searchValue}`);
          const err = new Error(`No case found linked with officer name ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        break;
      }

      case 'Accused Name': {
        const accRows = await this.executeZCQL(`SELECT CaseMasterID FROM Accused WHERE AccusedName = '${val}' OR AccusedName LIKE '%${val}%'`);
        if (accRows.length === 0) {
          console.log(`[DEBUG] Accused lookup returned no rows for search value: ${searchValue}`);
          const err = new Error(`No accused found with name ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        console.log(`[DEBUG] Accused found: ${searchValue}`);
        const accIds = [...new Set(accRows.map(r => r.CaseMasterID).filter(Boolean))];
        const inClause = accIds.map(id => `'${id}'`).join(',');
        rows = await this.executeZCQL(`SELECT ROWID, CaseMasterID, CrimeNo, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE ROWID IN (${inClause})`);
        if (rows.length === 0) {
          console.log(`[DEBUG] Case not found`);
          const err = new Error(`No case found linked with accused name ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        break;
      }

      case 'Victim Name': {
        const vicRows = await this.executeZCQL(`SELECT CaseMasterID FROM Victim WHERE VictimName = '${val}' OR VictimName LIKE '%${val}%'`);
        if (vicRows.length === 0) {
          console.log(`[DEBUG] Victim lookup returned no rows for search value: ${searchValue}`);
          const err = new Error(`No victim found with name ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        console.log(`[DEBUG] Victim found: ${searchValue}`);
        const vicIds = [...new Set(vicRows.map(r => r.CaseMasterID).filter(Boolean))];
        const inClause = vicIds.map(id => `'${id}'`).join(',');
        rows = await this.executeZCQL(`SELECT ROWID, CaseMasterID, CrimeNo, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE ROWID IN (${inClause})`);
        if (rows.length === 0) {
          console.log(`[DEBUG] Case not found`);
          const err = new Error(`No case found linked with victim name ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        break;
      }

      case 'KGID': {
        const empRows = await this.executeZCQL(`SELECT ROWID FROM Employee WHERE KGID = '${val}'`);
        if (empRows.length === 0) {
          console.log(`[DEBUG] Officer lookup returned no rows for KGID: ${searchValue}`);
          const err = new Error(`No officer found with KGID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        const empIds = [...new Set(empRows.map(r => r.ROWID).filter(Boolean))];
        const inClause = empIds.map(id => `'${id}'`).join(',');
        rows = await this.executeZCQL(`SELECT ROWID, CaseMasterID, CrimeNo, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE PolicePersonID IN (${inClause})`);
        if (rows.length === 0) {
          console.log(`[DEBUG] Case not found for officer KGID: ${searchValue}`);
          const err = new Error(`No case found linked with officer KGID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        break;
      }

      case 'Station ID': {
        const unitRows = await this.executeZCQL(`SELECT ROWID FROM Unit WHERE UnitID = '${val}'`);
        if (unitRows.length === 0) {
          console.log(`[DEBUG] Police Station lookup returned no rows for ID: ${searchValue}`);
          const err = new Error(`No police station found with ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        const unitIds = [...new Set(unitRows.map(r => r.ROWID).filter(Boolean))];
        const inClause = unitIds.map(id => `'${id}'`).join(',');
        rows = await this.executeZCQL(`SELECT ROWID, CaseMasterID, CrimeNo, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE PoliceStationID IN (${inClause})`);
        if (rows.length === 0) {
          console.log(`[DEBUG] Case not found`);
          const err = new Error(`No case found linked with police station ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        break;
      }

      case 'Station Name':
      case 'Police Unit': {
        const unitRows = await this.executeZCQL(`SELECT ROWID FROM Unit WHERE UnitName = '${val}' OR UnitName LIKE '%${val}%'`);
        if (unitRows.length === 0) {
          console.log(`[DEBUG] Police Station lookup returned no rows for search value: ${searchValue}`);
          const err = new Error(`No police station found with name ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        const unitIds = [...new Set(unitRows.map(r => r.ROWID).filter(Boolean))];
        const inClause = unitIds.map(id => `'${id}'`).join(',');
        rows = await this.executeZCQL(`SELECT ROWID, CaseMasterID, CrimeNo, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE PoliceStationID IN (${inClause})`);
        if (rows.length === 0) {
          console.log(`[DEBUG] Case not found`);
          const err = new Error(`No case found linked with police station name ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        break;
      }

      case 'Court ID': {
        const courtRows = await this.executeZCQL(`SELECT ROWID FROM Court WHERE CourtID = '${val}'`);
        if (courtRows.length === 0) {
          console.log(`[DEBUG] Court lookup returned no rows for ID: ${searchValue}`);
          const err = new Error(`No court found with ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        const courtIds = [...new Set(courtRows.map(r => r.ROWID).filter(Boolean))];
        const inClause = courtIds.map(id => `'${id}'`).join(',');
        rows = await this.executeZCQL(`SELECT ROWID, CaseMasterID, CrimeNo, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE CourtID IN (${inClause})`);
        if (rows.length === 0) {
          console.log(`[DEBUG] Case not found`);
          const err = new Error(`No case found linked with court ID ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        break;
      }

      case 'Court Name':
      case 'Court': {
        const courtRows = await this.executeZCQL(`SELECT ROWID FROM Court WHERE CourtName = '${val}' OR CourtName LIKE '%${val}%'`);
        if (courtRows.length === 0) {
          console.log(`[DEBUG] Court lookup returned no rows for search value: ${searchValue}`);
          const err = new Error(`No court found with name ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        const courtIds = [...new Set(courtRows.map(r => r.ROWID).filter(Boolean))];
        const inClause = courtIds.map(id => `'${id}'`).join(',');
        rows = await this.executeZCQL(`SELECT ROWID, CaseMasterID, CrimeNo, CrimeRegisteredDate, BriefFacts FROM CaseMaster WHERE CourtID IN (${inClause})`);
        if (rows.length === 0) {
          console.log(`[DEBUG] Case not found`);
          const err = new Error(`No case found linked with court name ${searchValue}.`);
          err.statusCode = 404;
          throw err;
        }
        break;
      }
    }

    // Deduplicate in case multiple matches (e.g. 2 accused in same case)
    const uniqueCases = new Map();
    rows.forEach(row => {
      if (row.CaseMasterID && !uniqueCases.has(row.CaseMasterID)) {
        uniqueCases.set(row.CaseMasterID, row);
      }
    });

    return Array.from(uniqueCases.values());
  }

  /**
   * Builds a relationship graph starting from a caseID
   */
  async getRelationshipGraph(caseID) {
    if (!caseID) {
      const error = new Error('caseID is required');
      error.statusCode = 400;
      throw error;
    }

    const caseRecord = await this.caseRepo.findCase({ caseID });

    if (!caseRecord) {
      const error = new Error('Case not found');
      error.statusCode = 404;
      throw error;
    }

    // Catalyst stores the foreign key as the ROWID of CaseMaster, not the business ID.
    const caseRowID = caseRecord.ROWID;
    const victims = await this.victimRepo.findVictim({ caseID: caseRowID });
    const accused = await this.accusedRepo.findAccused({ caseID: caseRowID });

    const { Employee, Unit, Court, ...restCaseData } = caseRecord;

    // --- FEATURE 16 PART 2: HIDDEN RELATIONSHIP DISCOVERY ---
    
    const repeatOffenders = [];
    const repeatVictims = [];
    let relatedOfficerCases = [];
    let relatedUnitCases = [];
    const summary = [];

    // 1. Repeat Offender Detection
    if (accused && accused.length > 0) {
      for (const person of accused) {
        if (!person.AccusedName) continue;
        const query = `SELECT Accused.AccusedName, CaseMaster.CaseMasterID, CaseMaster.CrimeNo, CaseMaster.CaseNo, CaseMaster.CrimeMajorHeadID FROM Accused INNER JOIN CaseMaster ON Accused.CaseMasterID = CaseMaster.ROWID WHERE Accused.AccusedName = '${person.AccusedName.replace(/'/g, "''")}' AND CaseMaster.ROWID != '${caseRowID}'`;
        const otherCases = await this.executeZCQL(query);
        if (otherCases.length > 0) {
          repeatOffenders.push({
            name: person.AccusedName,
            totalFIRs: otherCases.length + 1,
            relatedCases: otherCases,
            reason: "Same accused"
          });
        }
      }
    }

    // 2. Repeat Victim Detection
    if (victims && victims.length > 0) {
      for (const victim of victims) {
        if (!victim.VictimName) continue;
        const query = `SELECT Victim.VictimName, CaseMaster.CaseMasterID, CaseMaster.CrimeNo, CaseMaster.CaseNo, CaseMaster.CrimeMajorHeadID FROM Victim INNER JOIN CaseMaster ON Victim.CaseMasterID = CaseMaster.ROWID WHERE Victim.VictimName = '${victim.VictimName.replace(/'/g, "''")}' AND CaseMaster.ROWID != '${caseRowID}'`;
        const otherCases = await this.executeZCQL(query);
        if (otherCases.length > 0) {
          repeatVictims.push({
            name: victim.VictimName,
            totalFIRs: otherCases.length + 1,
            relatedCases: otherCases,
            reason: "Same victim"
          });
        }
      }
    }

    // 3. Officer Relationship Discovery
    if (caseRecord.PolicePersonID) {
      const query = `SELECT CaseMasterID, CrimeNo, CaseNo, CrimeMajorHeadID FROM CaseMaster WHERE PolicePersonID = '${caseRecord.PolicePersonID}' AND ROWID != '${caseRowID}'`;
      relatedOfficerCases = await this.executeZCQL(query);
    }

    // 4. Police Unit Relationship Discovery
    if (caseRecord.PoliceStationID) {
      const query = `SELECT CaseMasterID, CrimeNo, CaseNo, CrimeMajorHeadID FROM CaseMaster WHERE PoliceStationID = '${caseRecord.PoliceStationID}' AND ROWID != '${caseRowID}'`;
      relatedUnitCases = await this.executeZCQL(query);
    }

    // 5. Relationship Summary
    if (repeatOffenders.length > 0) {
      summary.push(`Found ${repeatOffenders.length} repeat offender(s) linked to other FIRs.`);
    }
    if (repeatVictims.length > 0) {
      summary.push(`Found ${repeatVictims.length} repeat victim(s) linked to other FIRs.`);
    }
    if (relatedOfficerCases.length > 0) {
      summary.push(`The Investigating Officer handled ${relatedOfficerCases.length} other related case(s).`);
    }
    if (relatedUnitCases.length > 0) {
      summary.push(`The Police Unit handled ${relatedUnitCases.length} other related case(s).`);
    }
    if (summary.length === 0) {
      summary.push('No hidden relationships discovered for this case.');
    }

    // --- FEATURE 18: ORGANIZED CRIME DETECTION ---
    let riskScore = 0;
    const ocReasons = [];
    const coOffenders = [];

    // Detect Co-Offenders
    for (let i = 0; i < repeatOffenders.length; i++) {
      for (let j = i + 1; j < repeatOffenders.length; j++) {
        const aCases = repeatOffenders[i].relatedCases.map(c => c.CaseMasterID);
        const bCases = repeatOffenders[j].relatedCases.map(c => c.CaseMasterID);
        const shared = aCases.filter(c => bCases.includes(c));
        if (shared.length > 0) {
          coOffenders.push({
            offenderA: repeatOffenders[i].name,
            offenderB: repeatOffenders[j].name,
            sharedCases: shared.length
          });
          riskScore += 40;
          ocReasons.push(`${repeatOffenders[i].name} and ${repeatOffenders[j].name} operate together as co-offenders in ${shared.length + 1} FIRs.`);
        }
      }
    }

    // Score Repeat Offenders
    if (repeatOffenders.length > 0) {
      const maxFirs = Math.max(...repeatOffenders.map(ro => ro.totalFIRs));
      if (maxFirs >= 3) {
        riskScore += 30;
        ocReasons.push(`High recidivism: An accused appears in ${maxFirs} FIRs.`);
      } else {
        riskScore += 15;
        ocReasons.push(`Repeat offenders detected across multiple FIRs.`);
      }
    }

    // Officer Investigation Pattern
    if (relatedOfficerCases.length > 0 && repeatOffenders.length > 0) {
      let officerTargetedScore = 0;
      repeatOffenders.forEach(ro => {
        const roCases = ro.relatedCases.map(c => c.CaseMasterID);
        const sharedWithOfficer = relatedOfficerCases.filter(c => roCases.includes(c.CaseMasterID));
        if (sharedWithOfficer.length > 0) {
          officerTargetedScore += 15;
          ocReasons.push(`Investigating Officer repeatedly investigated ${ro.name} across ${sharedWithOfficer.length + 1} cases.`);
        }
      });
      riskScore += officerTargetedScore;
    } else if (relatedOfficerCases.length >= 5) {
      riskScore += 10;
      ocReasons.push(`Investigating Officer handled a high volume (${relatedOfficerCases.length + 1}) of linked cases.`);
    }

    // Police Unit Volume
    if (relatedUnitCases.length >= 5) {
      riskScore += 10;
      ocReasons.push(`Police Unit handled a very high volume (${relatedUnitCases.length + 1}) of linked cases, suggesting a regional hotspot.`);
    }

    // Crime Category Pattern
    const allRelatedCases = [
      ...repeatOffenders.flatMap(ro => ro.relatedCases),
      ...repeatVictims.flatMap(rv => rv.relatedCases),
      ...relatedOfficerCases,
      ...relatedUnitCases
    ];
    
    let maxCategoryCount = 0;
    if (allRelatedCases.length > 0) {
      const categoryCounts = {};
      allRelatedCases.forEach(rc => {
        if (rc.CrimeMajorHeadID) {
          categoryCounts[rc.CrimeMajorHeadID] = (categoryCounts[rc.CrimeMajorHeadID] || 0) + 1;
        }
      });
      maxCategoryCount = Math.max(0, ...Object.values(categoryCounts));
      if (maxCategoryCount >= 3) {
        riskScore += 20;
        ocReasons.push(`Strong crime category pattern: ${maxCategoryCount} linked cases share the same Crime Category.`);
      }
    }

    if (riskScore === 0) {
      ocReasons.push("No organized crime indicators detected.");
    }

    let riskLevel = "Low";
    if (riskScore >= 40 && riskScore < 75) riskLevel = "Medium";
    if (riskScore >= 75) riskLevel = "High";

    const organizedCrimeIndicators = {
      riskLevel,
      reasons: ocReasons,
      coOffenders
    };

    // --- FEATURE 17: CRIMINAL NETWORK GRAPH GENERATION ---
    const nodes = [];
    const edges = [];
    const addedNodeIds = new Set();
    const addedEdgeIds = new Set();

    const addNode = (id, type, label, data = {}) => {
      if (!id || addedNodeIds.has(id)) return;
      nodes.push({ id, type, label, data: { ...data, label } });
      addedNodeIds.add(id);
    };

    const addEdge = (source, target, label) => {
      if (!source || !target) return;
      const id = `${source}-${target}-${label}`;
      if (addedEdgeIds.has(id)) return;
      edges.push({ id, source, target, label, relationship: label });
      addedEdgeIds.add(id);
    };

    // 1. Primary Case Node
    const primaryCaseId = `case-${restCaseData.CaseMasterID || caseID}`;
    addNode(primaryCaseId, 'case', `Case: ${restCaseData.CrimeNo || 'Unknown'}`, restCaseData);

    // 2. Officer Node
    if (Employee && Employee.EmployeeID) {
      const officerId = `officer-${Employee.EmployeeID}`;
      addNode(officerId, 'officer', `Officer: ${Employee.FirstName || Employee.EmployeeID}`, Employee);
      addEdge(officerId, primaryCaseId, 'investigates');
    }

    // 3. Unit Node
    if (Unit && Unit.UnitID) {
      const unitId = `unit-${Unit.UnitID}`;
      addNode(unitId, 'unit', `Unit: ${Unit.UnitName || Unit.UnitID}`, Unit);
      addEdge(primaryCaseId, unitId, 'belongs to');
    }

    // 4. Court Node
    if (Court && Court.CourtID) {
      const courtId = `court-${Court.CourtID}`;
      addNode(courtId, 'court', `Court: ${Court.CourtName || Court.CourtID}`, Court);
      addEdge(primaryCaseId, courtId, 'handled by');
    }

    // 5. Victims
    if (victims && victims.length > 0) {
      victims.forEach(v => {
        const victimId = `victim-${v.VictimMasterID || v.VictimName}`;
        addNode(victimId, 'victim', `Victim: ${v.VictimName}`, v);
        addEdge(primaryCaseId, victimId, 'has victim');
      });
    }

    // 6. Accused
    if (accused && accused.length > 0) {
      accused.forEach(a => {
        const accusedId = `accused-${a.AccusedMasterID || a.AccusedName}`;
        addNode(accusedId, 'accused', `Accused: ${a.AccusedName}`, a);
        addEdge(primaryCaseId, accusedId, 'has accused');
      });
    }

    // 7. Repeat Offenders (Related Cases)
    if (repeatOffenders.length > 0) {
      repeatOffenders.forEach(offender => {
        const offenderRec = accused.find(a => a.AccusedName === offender.name);
        const offenderId = offenderRec ? `accused-${offenderRec.AccusedMasterID || offenderRec.AccusedName}` : `accused-${offender.name}`;
        
        offender.relatedCases.forEach(rc => {
          const rcId = `case-${rc.CaseMasterID}`;
          addNode(rcId, 'case', `Case: ${rc.CrimeNo}`, rc);
          addEdge(offenderId, rcId, 'linked with');
        });
      });
    }

    // 8. Repeat Victims (Related Cases)
    if (repeatVictims.length > 0) {
      repeatVictims.forEach(victim => {
        const victimRec = victims.find(v => v.VictimName === victim.name);
        const victimId = victimRec ? `victim-${victimRec.VictimMasterID || victimRec.VictimName}` : `victim-${victim.name}`;
        
        victim.relatedCases.forEach(rc => {
          const rcId = `case-${rc.CaseMasterID}`;
          addNode(rcId, 'case', `Case: ${rc.CrimeNo}`, rc);
          addEdge(victimId, rcId, 'linked with');
        });
      });
    }

    // 9. Officer Related Cases
    if (relatedOfficerCases.length > 0 && Employee && Employee.EmployeeID) {
      const officerId = `officer-${Employee.EmployeeID}`;
      relatedOfficerCases.forEach(rc => {
        const rcId = `case-${rc.CaseMasterID}`;
        addNode(rcId, 'case', `Case: ${rc.CrimeNo}`, rc);
        addEdge(officerId, rcId, 'investigated');
      });
    }

    // 10. Unit Related Cases
    if (relatedUnitCases.length > 0 && Unit && Unit.UnitID) {
      const unitId = `unit-${Unit.UnitID}`;
      relatedUnitCases.forEach(rc => {
        const rcId = `case-${rc.CaseMasterID}`;
        addNode(rcId, 'case', `Case: ${rc.CrimeNo}`, rc);
        addEdge(unitId, rcId, 'handled');
      });
    }

    // --- DYNAMIC CONFIDENCE SCORING ---
    let dynamicConfidence = 10; // Base confidence
    
    // Network Size
    dynamicConfidence += Math.min(30, (nodes.length + edges.length) * 2);
    
    // Repeat Entities
    dynamicConfidence += Math.min(20, (repeatOffenders.length + repeatVictims.length) * 5);
    
    // Co-offender Groups
    dynamicConfidence += Math.min(20, coOffenders.length * 10);
    
    // Investigation Patterns
    if (relatedOfficerCases.length > 0) dynamicConfidence += 5;
    if (relatedUnitCases.length > 0) dynamicConfidence += 5;
    
    // Crime Category Pattern
    if (maxCategoryCount >= 3) {
      dynamicConfidence += 10;
    }
    
    organizedCrimeIndicators.confidence = Math.min(100, dynamicConfidence);
    return {
      case: restCaseData,
      officer: Employee || {},
      unit: Unit || {},
      court: Court || {},
      victims: victims || [],
      accused: accused || [],
      relationshipInsights: {
        repeatOffenders,
        repeatVictims,
        relatedOfficerCases,
        relatedUnitCases,
        summary
      },
      organizedCrimeIndicators,
      graph: {
        nodes,
        edges
      }
    };
  }
}

module.exports = IntelligenceService;
