'use strict';

/**
 * Parses user input deterministically using regular expressions.
 * Implements fallback matching and session-context reference resolution.
 * 
 * @param {string} message - User message
 * @param {object} [session] - Optional session object containing previous context
 * @returns {object|null} Intent and parameters, or null if no match could be parsed deterministically
 */
function parseDeterministically(message, session) {
  if (!message) return null;
  const msg = message.trim().toLowerCase();

  // 1. Direct Regex Matches (Stateless)
  
  // SEARCH_FIR matches
  let match = msg.match(/(?:show\s+fir|show\s+crime|find\s+case)\s+(\d+)/i);
  if (match) {
    const num = match[1];
    if (num.length >= 10) {
      return {
        intent: 'SEARCH_FIR',
        parameters: { crimeNo: num }
      };
    } else {
      return {
        intent: 'SEARCH_FIR',
        parameters: { caseNo: num }
      };
    }
  }

  // SEARCH_CRIMINAL matches
  match = msg.match(/(?:show\s+criminal|find\s+criminal)\s+(.+)/i);
  if (match) {
    const term = match[1].trim();
    if (/^[a-zA-Z]\d+$/i.test(term)) {
      return {
        intent: 'SEARCH_CRIMINAL',
        parameters: { accusedAId: term }
      };
    }
    return {
      intent: 'SEARCH_CRIMINAL',
      parameters: { criminalName: term }
    };
  }
  match = msg.match(/find\s+accused\s+(.+)/i);
  if (match) {
    return {
      intent: 'SEARCH_CRIMINAL',
      parameters: { accusedAId: match[1].trim() }
    };
  }

  // SEARCH_VICTIM matches
  match = msg.match(/(?:show\s+victim|find\s+victim)\s+(.+)/i);
  if (match) {
    return {
      intent: 'SEARCH_VICTIM',
      parameters: { victimName: match[1].trim() }
    };
  }

  // SEARCH_OFFICER matches
  match = msg.match(/(?:show\s+officer|find\s+officer)\s+(.+)/i);
  if (match) {
    const term = match[1].trim();
    if (/^\d+$/.test(term)) {
      return {
        intent: 'SEARCH_OFFICER',
        parameters: { badgeNumber: term }
      };
    }
    return {
      intent: 'SEARCH_OFFICER',
      parameters: { officerName: term }
    };
  }

  // 2. Contextual Reference matches (Stateful)
  if (session) {
    const isOfficerQuery = msg.includes('who investigated') || msg.includes('who is the officer') || msg.includes('officer who handled') || msg.includes('investigator');
    if (isOfficerQuery && session.lastOfficerName) {
      console.log(`[DeterministicParser] Resolved "who investigated it?" to officer: ${session.lastOfficerName}`);
      return {
        intent: 'SEARCH_OFFICER',
        parameters: { 
          officerName: session.lastOfficerName,
          officerID: session.lastOfficerId,
          badgeNumber: session.lastOfficerBadge
        }
      };
    }

    const isCriminalCasesQuery = msg.includes('how many cases') || msg.includes('his cases') || msg.includes('cases does he have') || msg.includes('cases he has');
    if (isCriminalCasesQuery && session.lastCriminalName) {
      console.log(`[DeterministicParser] Resolved "how many cases does he have?" to criminal: ${session.lastCriminalName}`);
      return {
        intent: 'SEARCH_CRIMINAL',
        parameters: { 
          criminalName: session.lastCriminalName,
          accusedID: session.lastCriminalId
        }
      };
    }

    const isPoliceStationQuery = msg.includes('police station') || msg.includes('handled the case') || msg.includes('handled that case') || msg.includes('station handled');
    if (isPoliceStationQuery && session.lastCaseMasterId) {
      console.log(`[DeterministicParser] Resolved "which station handled the case?" to caseID: ${session.lastCaseMasterId}`);
      return {
        intent: 'SEARCH_FIR',
        parameters: { 
          caseID: session.lastCaseMasterId,
          crimeNo: session.lastCrimeNo
        }
      };
    }
  }

  return null;
}

module.exports = {
  parseDeterministically
};
