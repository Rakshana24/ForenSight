'use strict';

const { LLMService } = require('./llmService');
const { getIntentDetectionPrompt, getFormatResponsePrompt } = require('../promptTemplates/chat.prompts');
const { parseDeterministically } = require('../utils/deterministicParser');
const SessionStore = require('../utils/sessionStore');

/**
 * Local helper to format database responses into clean human-readable answers
 * when QuickML API is unavailable or quota is exceeded.
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
    this._llmService = null;
  }

  getLLMService(req) {
    if (!this._llmService) {
      const catalyst = require('zcatalyst-sdk-node');
      const catalystApp = catalyst.initialize(req);
      this._llmService = new LLMService(catalystApp);
    }
    return this._llmService;
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
   * @param {string|number} [conversationId] - Active conversation ROWID to persist messages
   * @returns {Promise<string>} Human-readable formatted reply
   */
  async processChat(message, baseUrl, sessionId = 'default-session', req, conversationId) {
    let convoRepo = null;
    let convoService = null;

    // 1. Verify environment configuration
    if (!process.env.QUICKML_ENDPOINT_URL) {
      const err = new Error('Configuration Error: QUICKML_ENDPOINT_URL is not defined in the environment variables.');
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

    // 3.5 Check for Case Summary command
    const isSummaryCmd = lowerMsg === 'generate summary' || 
                         lowerMsg === 'generate case summary' || 
                         lowerMsg === 'generate ai case summary' ||
                         lowerMsg === 'summary';
    if (isSummaryCmd) {
      try {
        const finalAnswer = await this.generateInvestigationSummary(session, req);
        
        // Save to conversation history if active
        if (conversationId && req) {
          try {
            const ConversationRepository = require('../repositories/conversation.repository');
            const ConversationService = require('./conversation.service');
            const catalystApp = require('zcatalyst-sdk-node').initialize(req);
            convoRepo = new ConversationRepository(catalystApp);
            convoService = new ConversationService(catalystApp);

            await convoRepo.createMessage({
              ConversationID: conversationId,
              Role: 'user',
              Message: cleanMsg,
              MsgTimestamp: new Date().toISOString()
            });

            await convoRepo.createMessage({
              ConversationID: conversationId,
              Role: 'assistant',
              Message: finalAnswer,
              MsgTimestamp: new Date().toISOString()
            });

            // Update ContextMetadata
            const updates = {
              ROWID: conversationId,
              ContextMetadata: convoService.minifyContext(session)
            };
            await convoRepo.updateConversation(updates);
          } catch (dbErr) {
            console.error('[ChatService] Error saving summary to history:', dbErr.message);
          }
        }
        return finalAnswer;
      } catch (err) {
        console.error('[ChatService] Summary Generation Error:', err.message);
        return err.message || 'An error occurred while generating the investigation summary.';
      }
    }

    // 3.6 Check for AI Investigation Assessment command
    const isAssessmentCmd = lowerMsg === 'generate assessment' ||
                            lowerMsg === 'generate investigation assessment' ||
                            lowerMsg === 'generate ai investigation assessment' ||
                            lowerMsg === 'ai investigation assessment' ||
                            lowerMsg === 'assessment';
    if (isAssessmentCmd) {
      try {
        const finalAnswer = await this.generateInvestigationAssessment(session, req);
        
        // Save to conversation history if active
        if (conversationId && req) {
          try {
            const ConversationRepository = require('../repositories/conversation.repository');
            const ConversationService = require('./conversation.service');
            const catalystApp = require('zcatalyst-sdk-node').initialize(req);
            convoRepo = new ConversationRepository(catalystApp);
            convoService = new ConversationService(catalystApp);

            await convoRepo.createMessage({
              ConversationID: conversationId,
              Role: 'user',
              Message: cleanMsg,
              MsgTimestamp: new Date().toISOString()
            });

            await convoRepo.createMessage({
              ConversationID: conversationId,
              Role: 'assistant',
              Message: finalAnswer,
              MsgTimestamp: new Date().toISOString()
            });

            // Update ContextMetadata
            const updates = {
              ROWID: conversationId,
              ContextMetadata: convoService.minifyContext(session)
            };
            await convoRepo.updateConversation(updates);
          } catch (dbErr) {
            console.error('[ChatService] Error saving assessment to history:', dbErr.message);
          }
        }
        return finalAnswer;
      } catch (err) {
        console.error('[ChatService] Assessment Generation Error:', err.message);
        return err.message || 'An error occurred while generating the investigation assessment.';
      }
    }

    // Validate conversationID ownership if passed
    if (conversationId && req) {
      try {
        const ConversationRepository = require('../repositories/conversation.repository');
        const ConversationService = require('./conversation.service');
        const catalystApp = require('zcatalyst-sdk-node').initialize(req);
        convoRepo = new ConversationRepository(catalystApp);
        convoService = new ConversationService(catalystApp);

        const convo = await convoRepo.findConversationById(conversationId);
        if (!convo || convo.Status !== 'ACTIVE') {
          return 'Error: Conversation not found.';
        }
        if (convo.SessionID !== sessionId) {
          return 'Error: Unauthorized access to this conversation.';
        }
      } catch (e) {
        console.warn('[ChatService] Could not validate conversation ownership:', e.message);
      }
    }

    // 4. Handle Pronoun reference without context check
    if (isReferenceWithoutContext(cleanMsg, session)) {
      return 'Could you please specify which FIR, criminal, victim, or officer you are referring to?';
    }

    let intent = null;
    let parameters = null;
    let llmFailed = false;

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
      // 5. Call LLM for Intent Detection (with session context injection)
      try {
        const llm = this.getLLMService(req);
        const intentPrompt = getIntentDetectionPrompt(cleanMsg, session);
        const parsedIntent = await llm.generateJSON(intentPrompt);
        intent = parsedIntent.intent;
        parameters = parsedIntent.parameters;
      } catch (llmError) {
        console.warn(`[ChatService] QuickML intent detection failed. Attempting deterministic fallback...`, llmError.message || llmError);
        llmFailed = true;

        const parsed = parseDeterministically(cleanMsg, session);
        if (parsed) {
          console.log(`[ChatService] Deterministic parsing succeeded:`, parsed);
          intent = parsed.intent;
          parameters = parsed.parameters;
        } else {
          throw llmError;
        }
      }
    }

    // Handle Clarifying response from LLM
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

    // 9. Format response (LLM or Local fallback)
    let finalAnswer = '';
    if (llmFailed) {
      finalAnswer = formatLocalResponse(intent, apiResponse, session);
    } else {
      try {
        const llm = this.getLLMService(req);
        const formatPrompt = getFormatResponsePrompt(cleanMsg, apiResponse, session);
        finalAnswer = await llm.generateText(formatPrompt);
      } catch (formatError) {
        console.warn(`[ChatService] QuickML response formatting failed. Falling back to local formatting...`, formatError.message || formatError);
        finalAnswer = formatLocalResponse(intent, apiResponse, session);
      }
    }

    // Save to conversation history if active
    if (conversationId && convoRepo && convoService) {
      try {
        // 1. Save user message
        await convoRepo.createMessage({
          ConversationID: conversationId,
          Role: 'user',
          Message: cleanMsg,
          MsgTimestamp: new Date().toISOString()
        });

        // 2. Save assistant response
        await convoRepo.createMessage({
          ConversationID: conversationId,
          Role: 'assistant',
          Message: finalAnswer,
          MsgTimestamp: new Date().toISOString()
        });

        // 3. Update title and ContextMetadata
        const existingMsgs = await convoRepo.listMessages(conversationId);
        const isFirstMsg = existingMsgs.length <= 2; // user message + assistant response

        const updates = {
          ROWID: conversationId,
          ContextMetadata: convoService.minifyContext(session)
        };

        if (isFirstMsg) {
          const title = convoService.generateTitle(cleanMsg);
          updates.Title = title;
          console.log(`[ChatService] Automatically set conversation title to: ${title}`);
        }

        await convoRepo.updateConversation(updates);
      } catch (dbErr) {
        console.error('[ChatService] Error saving conversation history:', dbErr.message);
      }
    }

    return finalAnswer;
  }

  async generateInvestigationSummary(session, req) {
    const catalyst = require('zcatalyst-sdk-node');
    const app = catalyst.initialize(req);
    const zcql = app.zcql();

    const CaseRepository = require('../repositories/case.repository');
    const AccusedRepository = require('../repositories/accused.repository');
    const VictimRepository = require('../repositories/victim.repository');

    const caseRepo = new CaseRepository(zcql);
    const accusedRepo = new AccusedRepository(zcql);
    const victimRepo = new VictimRepository(zcql);

    let caseRecord = null;
    if (session.lastCaseMasterId) {
      const isRowId = isNaN(session.lastCaseMasterId) || Number(session.lastCaseMasterId) > 9999999999;
      if (isRowId) {
        try {
          const query = `SELECT * FROM CaseMaster WHERE ROWID = '${session.lastCaseMasterId}'`;
          const rows = await zcql.executeZCQLQuery(query);
          if (rows && rows.length > 0) {
            caseRecord = caseRepo.flattenRow(rows[0]);
            const cmRecord = rows[0].CaseMaster || {};
            
            // Lookup Unit
            if (cmRecord.PoliceStationID) {
              const units = await zcql.executeZCQLQuery(`SELECT * FROM Unit WHERE ROWID = '${cmRecord.PoliceStationID}'`);
              if (units.length > 0) caseRecord.Unit = units[0].Unit;
            }
            // Lookup CaseStatusMaster
            if (cmRecord.CaseStatusID) {
              const statuses = await zcql.executeZCQLQuery(`SELECT * FROM CaseStatusMaster WHERE ROWID = '${cmRecord.CaseStatusID}'`);
              if (statuses.length > 0) caseRecord.CaseStatusMaster = statuses[0].CaseStatusMaster;
            }
            // Lookup Employee
            if (cmRecord.PolicePersonID) {
              const emps = await zcql.executeZCQLQuery(`SELECT * FROM Employee WHERE ROWID = '${cmRecord.PolicePersonID}'`);
              if (emps.length > 0) caseRecord.Employee = emps[0].Employee;
            }
            // Lookup Court
            if (cmRecord.CourtID) {
              const courts = await zcql.executeZCQLQuery(`SELECT * FROM Court WHERE ROWID = '${cmRecord.CourtID}'`);
              if (courts.length > 0) caseRecord.Court = courts[0].Court;
            }
            // Resolve District
            const districtId = caseRecord.Unit?.DistrictID || caseRecord.Employee?.DistrictID;
            if (districtId) {
              const dists = await zcql.executeZCQLQuery(`SELECT * FROM District WHERE ROWID = '${districtId}'`);
              if (dists.length > 0) caseRecord.District = dists[0].District;
            }
            // Resolve CrimeHead
            if (cmRecord.CrimeMajorHeadID) {
              const heads = await zcql.executeZCQLQuery(`SELECT * FROM CrimeHead WHERE ROWID = '${cmRecord.CrimeMajorHeadID}'`);
              if (heads.length > 0) caseRecord.CrimeHead = heads[0].CrimeHead;
            }
            // Resolve GravityOffence
            if (cmRecord.GravityOffenceID) {
              const gravities = await zcql.executeZCQLQuery(`SELECT * FROM GravityOffence WHERE ROWID = '${cmRecord.GravityOffenceID}'`);
              if (gravities.length > 0) caseRecord.GravityOffence = gravities[0].GravityOffence;
            }
          }
        } catch (e) {
          console.error('[ChatService] Failed to findCase by ROWID:', e.message);
        }
      }
      
      if (!caseRecord) {
        try {
          caseRecord = await caseRepo.findCase({ caseID: session.lastCaseMasterId });
        } catch (err) {
          console.warn('[ChatService] findCase by business ID failed:', err.message);
        }
      }
    }

    if (!caseRecord && session.lastCrimeNo) {
      try {
        caseRecord = await caseRepo.findCase({ crimeNumber: session.lastCrimeNo });
      } catch (err) {
        console.warn('[ChatService] findCase by crimeNumber failed:', err.message);
      }
    }

    if (!caseRecord && session.lastCaseNo) {
      try {
        caseRecord = await caseRepo.findCase({ firNumber: session.lastCaseNo });
      } catch (err) {
        console.warn('[ChatService] findCase by firNumber failed:', err.message);
      }
    }

    if (!caseRecord) {
      throw new Error('No active investigation details found in the current conversation session. Please search for a case or crime record first.');
    }

    const caseRowID = caseRecord.ROWID;
    let victims = [];
    let accused = [];

    try {
      victims = await victimRepo.findVictim({ caseID: caseRowID });
    } catch (e) {
      console.warn('[ChatService] Failed to fetch victims for summary:', e.message);
    }

    try {
      accused = await accusedRepo.findAccused({ caseID: caseRowID });
    } catch (e) {
      console.warn('[ChatService] Failed to fetch accused for summary:', e.message);
    }

    const llm = this.getLLMService(req);
    const promptText = getCaseSummaryPrompt(caseRecord, victims, accused);
    console.log(`[ChatService] Generating case summary via QuickML...`);
    const summaryText = await llm.generateText(promptText);
    return summaryText;
  }

  async generateInvestigationAssessment(session, req) {
    const catalyst = require('zcatalyst-sdk-node');
    const app = catalyst.initialize(req);
    const zcql = app.zcql();

    const CaseRepository = require('../repositories/case.repository');
    const AccusedRepository = require('../repositories/accused.repository');
    const VictimRepository = require('../repositories/victim.repository');

    const caseRepo = new CaseRepository(zcql);
    const accusedRepo = new AccusedRepository(zcql);
    const victimRepo = new VictimRepository(zcql);

    let caseRecord = null;
    if (session.lastCaseMasterId) {
      const isRowId = isNaN(session.lastCaseMasterId) || Number(session.lastCaseMasterId) > 9999999999;
      if (isRowId) {
        try {
          const query = `SELECT * FROM CaseMaster WHERE ROWID = '${session.lastCaseMasterId}'`;
          const rows = await zcql.executeZCQLQuery(query);
          if (rows && rows.length > 0) {
            caseRecord = caseRepo.flattenRow(rows[0]);
            const cmRecord = rows[0].CaseMaster || {};
            
            // Lookup Unit
            if (cmRecord.PoliceStationID) {
              const units = await zcql.executeZCQLQuery(`SELECT * FROM Unit WHERE ROWID = '${cmRecord.PoliceStationID}'`);
              if (units.length > 0) caseRecord.Unit = units[0].Unit;
            }
            // Lookup CaseStatusMaster
            if (cmRecord.CaseStatusID) {
              const statuses = await zcql.executeZCQLQuery(`SELECT * FROM CaseStatusMaster WHERE ROWID = '${cmRecord.CaseStatusID}'`);
              if (statuses.length > 0) caseRecord.CaseStatusMaster = statuses[0].CaseStatusMaster;
            }
            // Lookup Employee
            if (cmRecord.PolicePersonID) {
              const emps = await zcql.executeZCQLQuery(`SELECT * FROM Employee WHERE ROWID = '${cmRecord.PolicePersonID}'`);
              if (emps.length > 0) caseRecord.Employee = emps[0].Employee;
            }
            // Lookup Court
            if (cmRecord.CourtID) {
              const courts = await zcql.executeZCQLQuery(`SELECT * FROM Court WHERE ROWID = '${cmRecord.CourtID}'`);
              if (courts.length > 0) caseRecord.Court = courts[0].Court;
            }
            // Resolve District
            const districtId = caseRecord.Unit?.DistrictID || caseRecord.Employee?.DistrictID;
            if (districtId) {
              const dists = await zcql.executeZCQLQuery(`SELECT * FROM District WHERE ROWID = '${districtId}'`);
              if (dists.length > 0) caseRecord.District = dists[0].District;
            }
            // Resolve CrimeHead
            if (cmRecord.CrimeMajorHeadID) {
              const heads = await zcql.executeZCQLQuery(`SELECT * FROM CrimeHead WHERE ROWID = '${cmRecord.CrimeMajorHeadID}'`);
              if (heads.length > 0) caseRecord.CrimeHead = heads[0].CrimeHead;
            }
            // Resolve GravityOffence
            if (cmRecord.GravityOffenceID) {
              const gravities = await zcql.executeZCQLQuery(`SELECT * FROM GravityOffence WHERE ROWID = '${cmRecord.GravityOffenceID}'`);
              if (gravities.length > 0) caseRecord.GravityOffence = gravities[0].GravityOffence;
            }
          }
        } catch (e) {
          console.error('[ChatService] Failed to findCase by ROWID for assessment:', e.message);
        }
      }
      
      if (!caseRecord) {
        try {
          caseRecord = await caseRepo.findCase({ caseID: session.lastCaseMasterId });
        } catch (err) {
          console.warn('[ChatService] findCase by business ID failed for assessment:', err.message);
        }
      }
    }

    if (!caseRecord && session.lastCrimeNo) {
      try {
        caseRecord = await caseRepo.findCase({ crimeNumber: session.lastCrimeNo });
      } catch (err) {
        console.warn('[ChatService] findCase by crimeNumber failed for assessment:', err.message);
      }
    }

    if (!caseRecord && session.lastCaseNo) {
      try {
        caseRecord = await caseRepo.findCase({ firNumber: session.lastCaseNo });
      } catch (err) {
        console.warn('[ChatService] findCase by firNumber failed for assessment:', err.message);
      }
    }

    if (!caseRecord) {
      throw new Error('No active investigation details found in the current conversation session. Please search for a case or crime record first.');
    }

    // 1. Programmatically detect case status (Active vs. Closed)
    const statusName = (caseRecord.CaseStatusMaster && caseRecord.CaseStatusMaster.CaseStatusName) || '';
    let isStatusDetected = false;
    let statusLabel = 'Case status unavailable.';

    if (statusName) {
      const lowerStatus = statusName.toLowerCase();
      if (lowerStatus.startsWith('closed') || lowerStatus === 'convicted' || lowerStatus === 'acquitted') {
        isStatusDetected = true;
        statusLabel = 'Closed';
      } else if (lowerStatus === 'registered' || lowerStatus === 'under investigation' || lowerStatus === 'arrest made' || lowerStatus === 'charge sheeted' || lowerStatus === 'under trial') {
        isStatusDetected = true;
        statusLabel = 'Active';
      }
    }

    // If status cannot be determined, display "Case status unavailable." programmatically to avoid redundant QuickML call
    if (!isStatusDetected) {
      return 'Case status unavailable.';
    }

    const caseRowID = caseRecord.ROWID;
    let victims = [];
    let accused = [];

    try {
      victims = await victimRepo.findVictim({ caseID: caseRowID });
    } catch (e) {
      console.warn('[ChatService] Failed to fetch victims for assessment:', e.message);
    }

    try {
      accused = await accusedRepo.findAccused({ caseID: caseRowID });
    } catch (e) {
      console.warn('[ChatService] Failed to fetch accused for assessment:', e.message);
    }

    const llm = this.getLLMService(req);
    const promptText = getCaseAssessmentPrompt(caseRecord, victims, accused, statusLabel);
    console.log(`[ChatService] Generating case assessment via QuickML...`);
    const assessmentText = await llm.generateText(promptText);
    return assessmentText;
  }
}

function getCaseSummaryPrompt(caseRecord, victims, accused) {
  const data = {
    caseNumber: caseRecord.CaseNo || 'Information not available.',
    crimeType: (caseRecord.CrimeHead && caseRecord.CrimeHead.CrimeGroupName) || 'Information not available.',
    status: (caseRecord.CaseStatusMaster && caseRecord.CaseStatusMaster.CaseStatusName) || 'Information not available.',
    briefFacts: caseRecord.BriefFacts || 'Information not available.',
    officer: (caseRecord.Employee && caseRecord.Employee.FirstName) || 'Information not available.',
    policeStation: (caseRecord.Unit && caseRecord.Unit.UnitName) || 'Information not available.',
    district: (caseRecord.District && caseRecord.District.DistrictName) || 'Information not available.',
    court: (caseRecord.Court && caseRecord.Court.CourtName) || 'Information not available.',
    victims: (victims && victims.length > 0) ? victims.map(v => ({
      name: v.VictimName || 'Information not available.',
      age: v.AgeYear || 'Information not available.',
      gender: v.GenderID == 1 ? 'Male' : (v.GenderID == 2 ? 'Female' : 'Information not available.')
    })) : [],
    criminals: (accused && accused.length > 0) ? accused.map(a => ({
      name: a.AccusedName || 'Information not available.',
      aliases: 'Information not available.'
    })) : []
  };

  return `You are a Senior Zoho Catalyst Solution Architect, Senior AI Engineer, and Crime Intelligence Assistant.
Your task is to generate a structured Case Summary for the current investigation using ONLY the facts provided in the JSON data below.

Strict Prompt Rules:
1. Ground your response ONLY in the provided JSON data. Never fabricate or extrapolate facts.
2. If any field or detail is missing, empty, or not present in the data, state "Information not available." exactly. Do not invent any names, dates, ages, genders, or facts.
3. Keep the tone extremely professional, concise, and clear.
4. The output MUST follow the exact structure below. Do not add extra markdown formatting, lists, headings, or introductory/concluding text. Only output the exact structured sections.

Required Output Format:
--------------------------------
CASE OVERVIEW
Case Number: [Case Number]
Crime Type: [Crime Type]
Investigation Status: [Investigation Status]

SUMMARY
[Short investigation summary generated by AI using the briefFacts and other case data.]

VICTIM DETAILS
Name: [Victim Name]
Age: [Victim Age]
Gender: [Victim Gender]
(If there are multiple victims, list their details consecutively in the same format. If no victims are present, state "Information not available." for each field under a single VICTIM DETAILS block.)

CRIMINAL DETAILS
Name: [Criminal Name]
Known aliases (if available): [Aliases]
(If there are multiple criminals/accused, list their details consecutively in the same format. If no criminals are present, state "Information not available." for each field under a single CRIMINAL DETAILS block.)

INVESTIGATION
Investigating Officer: [Investigating Officer]
Police Station: [Police Station]
District: [District]
Court Handling: [Court Handling]

KEY FINDINGS
• [Important observation 1 - generated from briefFacts or case details]
• [Important observation 2 - generated from briefFacts or case details]
• [Important observation 3 - generated from briefFacts or case details]
(If no findings can be derived, list three bullets stating "Information not available.")

CURRENT STATUS
[Current investigation progress - based on the investigation status and case details.]
--------------------------------

Here is the JSON data to summarize:
${JSON.stringify(data, null, 2)}`;
}

function getCaseAssessmentPrompt(caseRecord, victims, accused, statusLabel) {
  const data = {
    caseNumber: caseRecord.CaseNo || 'Information not available.',
    crimeType: (caseRecord.CrimeHead && caseRecord.CrimeHead.CrimeGroupName) || 'Information not available.',
    status: (caseRecord.CaseStatusMaster && caseRecord.CaseStatusMaster.CaseStatusName) || 'Information not available.',
    briefFacts: caseRecord.BriefFacts || 'Information not available.',
    officer: (caseRecord.Employee && caseRecord.Employee.FirstName) || 'Information not available.',
    policeStation: (caseRecord.Unit && caseRecord.Unit.UnitName) || 'Information not available.',
    district: (caseRecord.District && caseRecord.District.DistrictName) || 'Information not available.',
    court: (caseRecord.Court && caseRecord.Court.CourtName) || 'Information not available.',
    victims: (victims && victims.length > 0) ? victims.map(v => ({
      name: v.VictimName || 'Information not available.',
      age: v.AgeYear || 'Information not available.',
      gender: v.GenderID == 1 ? 'Male' : (v.GenderID == 2 ? 'Female' : 'Information not available.')
    })) : [],
    accused: (accused && accused.length > 0) ? accused.map(a => ({
      name: a.AccusedName || 'Information not available.',
      age: a.AgeYear || 'Information not available.',
      gender: a.GenderID == 1 ? 'Male' : (a.GenderID == 2 ? 'Female' : 'Information not available.')
    })) : []
  };

  return `You are a professional crime intelligence analyst assisting law enforcement investigators.
Analyze the following case details, victim profiles, and accused profiles to produce a professional, hallucination-free Investigation Assessment.

Case Details JSON:
${JSON.stringify(data, null, 2)}

Case Status Categorization: ${statusLabel}

STRICT ASSESSMENT RULES:
1. NEVER fabricate any evidence, witnesses, suspects, findings, or recommendations.
2. If any piece of information is not present in the provided JSON, use "Information not available."
3. Follow the output format strictly based on the Case Status Categorization. Do NOT add extra markdown bolding, lists, headings, or introductory/concluding text. Only output the exact structured sections.

=== IF Case Status Categorization is "Case status unavailable." ===
Output exactly:
Case status unavailable.

=== IF Case Status Categorization is "Active" ===
Output format (use exact headers in uppercase, with dashes below as dividers):
----------------------------------
INVESTIGATION STATUS
Active

CASE OVERVIEW
[A short paragraph summarizing the facts of the investigation]

KEY FINDINGS
• [Finding 1]
• [Finding 2]
• [Finding 3]
(Include bullet points matching facts. If no key findings exist, output "Information not available.")

INVESTIGATION GAPS
• [Gap 1]
• [Gap 2]
• [Gap 3]
(Identify logical gaps such as missing forensic analysis, witnesses not interviewed, or evidence pending verification based on the facts. Do NOT invent specific names of evidence or witnesses that do not exist, keep it logical to the facts, or use "Information not available.")

RECOMMENDED NEXT ACTIONS
• [Action 1]
• [Action 2]
• [Action 3]
(Provide concrete, actionable steps like cross-checking FIRs, interviewing neighbors, or examining scene records. Do NOT invent fabricated items.)

RISK LEVEL
[Specify: Low OR Medium OR High]
(Based on the crime type, gravity, and accused details)

OVERALL AI ASSESSMENT
[Provide a professional, analytical summary of the current investigation's progress, strengths, and immediate needs.]
----------------------------------

=== IF Case Status Categorization is "Closed" ===
Output format (use exact headers in uppercase, with dashes below as dividers):
----------------------------------
CASE STATUS
Closed

CASE OVERVIEW
[A short paragraph summarizing the facts and the conclusion of the case]

CASE OUTCOME
Investigation completed.

KEY FINDINGS
• [Key evidence/milestone 1]
• [Key evidence/milestone 2]
• [Key evidence/milestone 3]
(List important breakthroughs, evidence collected, or milestones based on the facts.)

SUCCESS FACTORS
• [Factor 1]
• [Factor 2]
• [Factor 3]
(Identify what led to resolution, such as witness cooperation, quick arrest, or forensic evidence.)

LESSONS LEARNED
• [Lesson 1]
• [Lesson 2]
• [Lesson 3]
(Analytical lessons or future best practices/recommendations for similar cases.)

CASE QUALITY ASSESSMENT
[Specify: Excellent OR Good OR Average OR Needs Review]
(Assess how thoroughly the case was resolved based on facts)

OVERALL AI ASSESSMENT
[Provide a professional, analytical summary explaining how the investigation concluded and highlighting key performance metrics.]
----------------------------------`;
}

module.exports = ChatService;
