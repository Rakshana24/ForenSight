'use strict';

const { GeminiClient } = require('../llm/gemini.client');
const { getIntentDetectionPrompt, getFormatResponsePrompt } = require('../promptTemplates/chat.prompts');
const { parseDeterministically } = require('../utils/deterministicParser');
const SessionStore = require('../utils/sessionStore');

/**
 * Local helper to format database responses into clean human-readable answers
 * when Gemini API is unavailable or quota is exceeded.
 */
function formatLocalResponse(intent, apiResponse, session) {
  if (!apiResponse) {
    return 'No details could be retrieved from the database.';
  }
  
  if (apiResponse.error) {
    return `Could not retrieve information from the database: ${apiResponse.error}`;
  }

  const rawData = apiResponse.data || apiResponse;
  const records = Array.isArray(rawData) ? rawData : [rawData];
  const record = records[0];

  if (!record || Object.keys(record).length === 0) {
    return 'No record found matching the search parameters in the database.';
  }

  // Conversational wording based on context
  if (intent === 'SEARCH_CRIMINAL' && records.length > 1) {
    const name = record.AccusedName || session.lastCriminalName || 'The accused';
    return `[Local Fallback Formatting] ${name} is associated with ${records.length} cases in our records. Case IDs: ${records.map(r => r.CaseMasterID || r.ROWID).join(', ')}`;
  }

  let output = `[Local Fallback Formatting] Successfully retrieved matching record details:\n\n`;

  if (intent === 'SEARCH_FIR') {
    output += `• Crime Number: ${record.CrimeNo || 'N/A'}\n`;
    output += `• Case/FIR Number: ${record.CaseNo || 'N/A'}\n`;
    output += `• Registered Date: ${record.CrimeRegisteredDate || 'N/A'}\n`;
    output += `• Facts: ${record.BriefFacts || 'N/A'}\n`;
    if (record.CaseStatusMaster) {
      output += `• Case Status: ${record.CaseStatusMaster.CaseStatusName || 'N/A'}\n`;
    }
    if (record.Unit) {
      output += `• Police Station: ${record.Unit.UnitName || 'N/A'}\n`;
    }
  } else if (intent === 'SEARCH_CRIMINAL') {
    output += `• Accused Name: ${record.AccusedName || 'N/A'}\n`;
    output += `• Accused Code: ${record.AccusedNo || 'N/A'}\n`;
    output += `• Case ID: ${record.CaseMasterID || 'N/A'}\n`;
  } else if (intent === 'SEARCH_VICTIM') {
    output += `• Victim Name: ${record.VictimName || 'N/A'}\n`;
    output += `• Gender ID: ${record.GenderID || 'N/A'}\n`;
    output += `• Case ID: ${record.CaseMasterID || 'N/A'}\n`;
  } else if (intent === 'SEARCH_OFFICER') {
    output += `• Officer Name: ${record.FirstName || 'N/A'}\n`;
    output += `• Badge Number (KGID): ${record.KGID || 'N/A'}\n`;
    output += `• Employee ID: ${record.EmployeeID || 'N/A'}\n`;
  } else {
    output += JSON.stringify(record, null, 2);
  }

  return output;
}

/**
 * Checks if the message refers to pronouns/context, but the session context is empty.
 */
function isReferenceWithoutContext(message, session) {
  const msg = message.toLowerCase();
  
  // Reference terms
  const pronouns = [
    '\\bhe\\b', '\\bhim\\b', '\\bhis\\b', '\\bit\\b', '\\bits\\b', '\\bshe\\b', '\\bher\\b',
    'who investigated', 'handled the case', 'handled that case', 'that case', 'the case', 
    'which station', 'which police station', 'investigator', 'cases he has', 'cases does he'
  ];
  
  const hasReference = pronouns.some(pattern => {
    const regex = new RegExp(pattern, 'i');
    return regex.test(msg);
  });

  if (!hasReference) return false;

  // Check if session contains any valid context
  const hasContext = !!(
    session.lastCaseMasterId ||
    session.lastCrimeNo ||
    session.lastCriminalName ||
    session.lastCriminal ||
    session.lastVictimName ||
    session.lastVictim ||
    session.lastOfficerName ||
    session.lastOfficer
  );

  return !hasContext;
}

/**
 * Case-insensitive value retriever from object keys.
 */
function getValue(obj, ...keys) {
  if (!obj) return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key];
    const lowerKey = key.toLowerCase();
    if (obj[lowerKey] !== undefined) return obj[lowerKey];
    const camelKey = key.charAt(0).toUpperCase() + key.slice(1);
    if (obj[camelKey] !== undefined) return obj[camelKey];
  }
  return undefined;
}

/**
 * Extracts and updates session memory based on API responses.
 */
function updateSessionFromApiResponse(sessionId, intent, apiResponse, caseDetails) {
  if (!apiResponse || apiResponse.error) return;

  const rawData = apiResponse.data || apiResponse;
  const records = Array.isArray(rawData) ? rawData : [rawData];
  const record = records[0];

  if (!record || Object.keys(record).length === 0) return;

  const sessionUpdates = {};

  if (intent === 'SEARCH_FIR') {
    sessionUpdates.lastIntent = 'SEARCH_FIR';
    sessionUpdates.lastCaseMasterId = getValue(record, 'CaseMasterID', 'casemasterid', 'ROWID', 'rowid');
    sessionUpdates.lastCrimeNo = getValue(record, 'CrimeNo', 'crimeno');
    sessionUpdates.lastCaseNo = getValue(record, 'CaseNo', 'caseno');
    
    const emp = record.Employee || record.employee;
    if (emp) {
      const name = getValue(emp, 'FirstName', 'firstname');
      sessionUpdates.lastOfficer = name ? { name } : null;
      sessionUpdates.lastOfficerId = getValue(emp, 'EmployeeID', 'employeeid', 'ROWID', 'rowid');
      sessionUpdates.lastOfficerName = name;
      sessionUpdates.lastOfficerBadge = getValue(emp, 'KGID', 'kgid');
    }
    const unit = record.Unit || record.unit;
    if (unit) {
      sessionUpdates.lastPoliceStationId = getValue(unit, 'UnitID', 'unitid', 'ROWID', 'rowid');
      sessionUpdates.lastPoliceStationName = getValue(unit, 'UnitName', 'unitname');
    }
  } else if (intent === 'SEARCH_CRIMINAL') {
    const criminalName = getValue(record, 'AccusedName', 'accusedname');
    sessionUpdates.lastIntent = 'SEARCH_CRIMINAL';
    sessionUpdates.lastCriminal = criminalName ? { name: criminalName } : null;
    sessionUpdates.lastCriminalName = criminalName;
    sessionUpdates.lastCriminalId = getValue(record, 'AccusedMasterID', 'accusedmasterid', 'ROWID', 'rowid');
    const caseId = getValue(record, 'CaseMasterID', 'casemasterid');
    if (caseId) {
      sessionUpdates.lastCaseMasterId = caseId;
    }
  } else if (intent === 'SEARCH_VICTIM') {
    const victimName = getValue(record, 'VictimName', 'victimname');
    sessionUpdates.lastIntent = 'SEARCH_VICTIM';
    sessionUpdates.lastVictim = victimName ? { name: victimName } : null;
    sessionUpdates.lastVictimName = victimName;
    sessionUpdates.lastVictimId = getValue(record, 'VictimMasterID', 'victimmasterid', 'ROWID', 'rowid');
    
    if (caseDetails) {
      sessionUpdates.lastCaseMasterId = caseDetails.CaseMasterID;
      sessionUpdates.lastCrimeNo = caseDetails.CrimeNo;
      sessionUpdates.lastCaseNo = caseDetails.CaseNo;
    } else {
      const caseId = getValue(record, 'CaseMasterID', 'casemasterid');
      if (caseId) {
        sessionUpdates.lastCaseMasterId = caseId;
      }
    }
  } else if (intent === 'SEARCH_OFFICER') {
    const name = getValue(record, 'FirstName', 'firstname');
    sessionUpdates.lastIntent = 'SEARCH_OFFICER';
    sessionUpdates.lastOfficer = name ? { name } : null;
    sessionUpdates.lastOfficerName = name;
    sessionUpdates.lastOfficerId = getValue(record, 'EmployeeID', 'employeeid', 'ROWID', 'rowid');
    sessionUpdates.lastOfficerBadge = getValue(record, 'KGID', 'kgid');
  }

  SessionStore.updateSession(sessionId, sessionUpdates);
  console.log(`[SessionStore] Updated session ${sessionId} memory for intent ${intent}:`, sessionUpdates);
}

class ChatService {
  constructor() {
    this._geminiClient = null;
  }

  getGeminiClient() {
    if (!this._geminiClient) {
      this._geminiClient = new GeminiClient();
    }
    return this._geminiClient;
  }

  /**
   * Processes the user message, detects intent, routes to local API, and formats the output.
   * Keeps conversation memory context-aware.
   * 
   * @param {string} message - Original user input
   * @param {string} baseUrl - Base URL for loopback requests
   * @param {string} [sessionId] - Session ID (default: 'default-session')
   * @returns {Promise<string>} Human-readable formatted reply
   */
  /**
   * Looks up a CaseMaster record by its Catalyst ROWID.
   */
  async lookupCaseByRowId(caseRowId, req) {
    if (!caseRowId) return null;
    
    if (req && req.isMock) {
      console.log(`[ChatService] Mock lookupCaseByRowId for ROWID: ${caseRowId}`);
      return {
        CaseMasterID: 1,
        CrimeNo: '100160057202100001',
        CaseNo: '202100001'
      };
    }

    try {
      const catalyst = require('zcatalyst-sdk-node');
      const app = catalyst.initialize(req);
      const zcql = app.zcql();
      const query = `SELECT * FROM CaseMaster WHERE ROWID = '${caseRowId}'`;
      console.log(`[ChatService] Resolving Case ROWID ${caseRowId} via ZCQL...`);
      const result = await zcql.executeZCQLQuery(query);
      if (result && result.length > 0) {
        const caseRow = result[0].CaseMaster || {};
        console.log(`[ChatService] Resolved ROWID ${caseRowId} to business CaseMasterID: ${caseRow.CaseMasterID}`);
        return {
          CaseMasterID: caseRow.CaseMasterID,
          CrimeNo: caseRow.CrimeNo,
          CaseNo: caseRow.CaseNo
        };
      }
    } catch (error) {
      console.error(`[ChatService] Failed to resolve Case ROWID ${caseRowId} via ZCQL:`, error.message);
    }
    return null;
  }

  /**
   * Processes the user message, detects intent, routes to local API, and formats the output.
   * Keeps conversation memory context-aware.
   * 
   * @param {string} message - Original user input
   * @param {string} baseUrl - Base URL for loopback requests
   * @param {string} [sessionId] - Session ID (default: 'default-session')
   * @param {object} [req] - HTTP request object
   * @returns {Promise<string>} Human-readable formatted reply
   */
  async processChat(message, baseUrl, sessionId = 'default-session', req) {
    // 1. Verify environment configuration
    if (!process.env.GEMINI_API_KEY) {
      const err = new Error('Configuration Error: GEMINI_API_KEY is not defined in the environment variables.');
      err.name = 'ConfigurationError';
      err.status = 500;
      throw err;
    }

    if (!message || message.trim() === '') {
      return 'Please enter a message.';
    }

    const cleanMsg = message.trim();
    const lowerMsg = cleanMsg.toLowerCase();

    // 2. Handle deterministic Clear / Reset command
    const isResetCmd = lowerMsg === 'clear' || lowerMsg === 'reset' || lowerMsg === 'clear conversation' || lowerMsg === 'reset conversation' || lowerMsg === 'clear memory';
    if (isResetCmd) {
      SessionStore.resetSession(sessionId);
      return 'Conversation memory has been reset.';
    }

    // 3. Fetch session memory
    const session = SessionStore.getSession(sessionId);

    // 4. Handle Pronoun reference without context check
    if (isReferenceWithoutContext(cleanMsg, session)) {
      return 'Could you please specify which FIR, criminal, victim, or officer you are referring to?';
    }

    let intent = null;
    let parameters = null;
    let geminiFailed = false;

    // Check for case follow-up queries programmatically
    // If the user query is about the police station, officer, court, or FIR details associated with the case,
    // and the session context contains a CaseMasterID, we map directly to SEARCH_FIR.
    const isCaseFollowUp = lowerMsg.includes('police station') || 
                           lowerMsg.includes('station handled') || 
                           lowerMsg.includes('which court') ||
                           lowerMsg.includes('handled the case') ||
                           lowerMsg.includes('what was the fir') ||
                           lowerMsg.includes('what was the crime') ||
                           lowerMsg.includes('who investigated') || 
                           lowerMsg.includes('who was the officer') ||
                           lowerMsg.includes('investigator') || 
                           lowerMsg.includes('investigating officer') ||
                           lowerMsg.includes('officer who');

    if (isCaseFollowUp && session.lastCaseMasterId) {
      console.log(`[ChatService] Programmatic follow-up resolution: mapping query directly to SEARCH_FIR`);
      
      intent = 'SEARCH_FIR';
      parameters = {
        caseID: session.lastCaseMasterId,
        crimeNo: session.lastCrimeNo,
        caseNo: session.lastCaseNo
      };
    } else {
      // 5. Call Gemini for Intent Detection (with session context injection)
      try {
        const gemini = this.getGeminiClient();
        const intentPrompt = getIntentDetectionPrompt(cleanMsg, session);
        const parsedIntent = await gemini.generateJSON(intentPrompt);
        intent = parsedIntent.intent;
        parameters = parsedIntent.parameters;
      } catch (geminiError) {
        console.warn(`[ChatService] Gemini intent detection failed. Attempting deterministic fallback...`, geminiError.message || geminiError);
        geminiFailed = true;

        const parsed = parseDeterministically(cleanMsg, session);
        if (parsed) {
          console.log(`[ChatService] Deterministic parsing succeeded:`, parsed);
          intent = parsed.intent;
          parameters = parsed.parameters;
        } else {
          throw geminiError;
        }
      }
    }

    // Handle Clarifying response from Gemini
    if (intent === 'CLARIFY') {
      return 'Could you please specify which FIR, criminal, victim, or officer you are referring to?';
    }

    if (intent === 'UNKNOWN' || !intent) {
      return 'I could not determine which crime information you are looking for.';
    }

    let apiPath = '';
    let queryParams = new URLSearchParams();

    // 6. Map Intent parameters to API query strings
    switch (intent) {
      case 'SEARCH_FIR': {
        const { crimeNo, caseNo, caseID, caseMasterId } = parameters || {};
        const finalCaseID = caseID || caseMasterId || (parameters && parameters.caseMasterId);
        
        if (!crimeNo && !caseNo && !finalCaseID) {
          return 'Please provide the FIR or Case number you want to search for.';
        }
        apiPath = '/fir';
        if (crimeNo) {
          queryParams.append('crimeNumber', crimeNo);
        } else if (caseNo) {
          queryParams.append('firNumber', caseNo);
        } else if (finalCaseID) {
          queryParams.append('caseID', finalCaseID);
          queryParams.append('caseMasterId', finalCaseID);
        }
        break;
      }

      case 'SEARCH_CRIMINAL': {
        const { criminalName, accusedAId, accusedID } = parameters || {};
        if (!criminalName && !accusedAId && !accusedID) {
          return 'Please provide the accused name or code (e.g. A1) you want to search for.';
        }
        apiPath = '/criminal';
        if (criminalName) {
          queryParams.append('accusedName', criminalName);
        } else if (accusedID) {
          queryParams.append('accusedID', accusedID);
        } else if (accusedAId) {
          queryParams.append('accusedID', accusedAId);
        }
        break;
      }

      case 'SEARCH_VICTIM': {
        const { victimName, victimID, caseID } = parameters || {};
        if (!victimName && !victimID && !caseID) {
          return 'Please provide the victim name you want to search for.';
        }
        apiPath = '/victim';
        if (victimName) queryParams.append('victimName', victimName);
        if (victimID) queryParams.append('victimID', victimID);
        if (caseID) queryParams.append('caseID', caseID);
        break;
      }

      case 'SEARCH_OFFICER': {
        const { officerName, badgeNumber, officerID } = parameters || {};
        if (!officerName && !badgeNumber && !officerID) {
          return 'Please provide the officer name or badge number you want to search for.';
        }
        apiPath = '/officer';
        if (officerID) {
          queryParams.append('officerID', officerID);
        } else {
          if (officerName) queryParams.append('officerName', officerName);
          if (badgeNumber) queryParams.append('badgeNumber', badgeNumber);
        }
        break;
      }

      default:
        return 'I could not determine which crime information you are looking for.';
    }

    // 7. Make loopback HTTP request
    const targetUrl = `${baseUrl}${apiPath}?${queryParams.toString()}`;
    console.log(`[ChatService] Making internal loopback request to: ${targetUrl}`);

    let apiResponse;
    try {
      const response = await fetch(targetUrl);
      apiResponse = await response.json();
      
      if (!response.ok || apiResponse.error) {
        const errorMsg = apiResponse.error || `HTTP error! status: ${response.status}`;
        console.warn(`[ChatService] Target API returned error: ${errorMsg}`);
        apiResponse = { error: errorMsg };
      }
    } catch (fetchError) {
      console.error(`[ChatService] Fetch error calling target API:`, fetchError.message || fetchError);
      return `Failed to connect to the internal database API. Please ensure the local server is running.`;
    }

    // Resolve case details if victim search was performed to get business CaseMasterID
    let caseDetails = null;
    if (intent === 'SEARCH_VICTIM' && !apiResponse.error) {
      const rawData = apiResponse.data || apiResponse;
      const records = Array.isArray(rawData) ? rawData : [rawData];
      const record = records[0];
      if (record) {
        const caseRowId = getValue(record, 'CaseMasterID', 'casemasterid');
        if (caseRowId) {
          caseDetails = await this.lookupCaseByRowId(caseRowId, req);
          if (caseDetails) {
            // Overwrite the internal ROWID with the business CaseMasterID to avoid exposing it to user
            if (record.CaseMasterID !== undefined) record.CaseMasterID = caseDetails.CaseMasterID;
            if (record.casemasterid !== undefined) record.casemasterid = caseDetails.CaseMasterID;
          }
        }
      }
    }

    // 8. Update conversation session memory on success
    updateSessionFromApiResponse(sessionId, intent, apiResponse, caseDetails);

    // 9. Format response (Gemini or Local fallback)
    let finalAnswer = '';
    if (geminiFailed) {
      finalAnswer = formatLocalResponse(intent, apiResponse, session);
    } else {
      try {
        const gemini = this.getGeminiClient();
        const formatPrompt = getFormatResponsePrompt(cleanMsg, apiResponse, session);
        finalAnswer = await gemini.generateText(formatPrompt);
      } catch (formatError) {
        console.warn(`[ChatService] Gemini response formatting failed. Falling back to local formatting...`, formatError.message || formatError);
        finalAnswer = formatLocalResponse(intent, apiResponse, session);
      }
    }

    return finalAnswer;
  }
}

module.exports = ChatService;
