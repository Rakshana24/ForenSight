'use strict';

class SessionStore {
  constructor() {
    this.sessions = {};
  }

  /**
   * Returns the session object for the given sessionId.
   * If the session does not exist, initializes it with default null values.
   * 
   * @param {string} sessionId - Session identifier
   * @returns {object} Session context object
   */
  getSession(sessionId) {
    const id = sessionId || 'default-session';
    if (!this.sessions[id]) {
      this.sessions[id] = {
        lastIntent: null,
        lastCaseMasterId: null,
        lastCrimeNo: null,
        lastCaseNo: null,
        lastCriminal: null,
        lastCriminalName: null,
        lastCriminalId: null,
        lastVictim: null,
        lastVictimName: null,
        lastVictimId: null,
        lastOfficer: null,
        lastOfficerName: null,
        lastOfficerId: null,
        lastOfficerBadge: null,
        lastPoliceStationId: null,
        lastPoliceStationName: null
      };
    }
    return this.sessions[id];
  }

  /**
   * Updates session context variables.
   * 
   * @param {string} sessionId - Session identifier
   * @param {object} updates - Key-value updates to merge
   */
  updateSession(sessionId, updates) {
    const session = this.getSession(sessionId);
    Object.assign(session, updates);
  }

  /**
   * Resets all conversation memory for a session.
   * 
   * @param {string} sessionId - Session identifier
   */
  resetSession(sessionId) {
    const id = sessionId || 'default-session';
    this.sessions[id] = {
      lastIntent: null,
      lastCaseMasterId: null,
      lastCrimeNo: null,
      lastCaseNo: null,
      lastCriminal: null,
      lastCriminalName: null,
      lastCriminalId: null,
      lastVictim: null,
      lastVictimName: null,
      lastVictimId: null,
      lastOfficer: null,
      lastOfficerName: null,
      lastOfficerId: null,
      lastOfficerBadge: null,
      lastPoliceStationId: null,
      lastPoliceStationName: null
    };
    console.log(`[SessionStore] Reset conversation memory for session: ${id}`);
  }
}

module.exports = new SessionStore();
