'use strict';

const ConversationRepository = require('../repositories/conversation.repository');
const SessionStore = require('../utils/sessionStore');

class ConversationService {
  /**
   * @param {object} app - Zoho Catalyst app instance
   */
  constructor(app) {
    this.repository = new ConversationRepository(app);
  }

  /**
   * Automatically generates a conversation title from the first user message.
   * 
   * @param {string} message - User message
   * @returns {string} Generated title
   */
  generateTitle(message) {
    if (!message) return 'New Investigation';
    const msg = message.trim();
    
    // Match FIR/Crime Number
    let match = msg.match(/(?:show\s+fir|show\s+crime|find\s+case)\s+(\d+)/i);
    if (match) {
      return `FIR ${match[1]} Investigation`;
    }
    
    // Match Criminal / Accused
    match = msg.match(/(?:show\s+criminal|find\s+criminal|show\s+accused|find\s+accused)\s+(.+)/i);
    if (match) {
      return `Criminal Profile - ${match[1].trim()}`;
    }
    
    // Match Victim
    match = msg.match(/(?:show\s+victim|find\s+victim)\s+(.+)/i);
    if (match) {
      return `Victim Profile - ${match[1].trim()}`;
    }
    
    // Match Officer
    match = msg.match(/(?:show\s+officer|find\s+officer)\s+(.+)/i);
    if (match) {
      return `Officer Profile - ${match[1].trim()}`;
    }
    
    // Default fallback
    return msg.length > 30 ? msg.substring(0, 27) + '...' : msg;
  }

  /**
   * Minifies context object keys to fit safely within VarChar(255) database limit.
   */
  minifyContext(session) {
    if (!session) return null;
    const min = {};
    
    if (session.lastIntent) min.i = session.lastIntent;
    if (session.lastCaseMasterId) min.cm = session.lastCaseMasterId;
    if (session.lastCrimeNo) min.cn = session.lastCrimeNo;
    if (session.lastCaseNo) min.cNo = session.lastCaseNo;
    if (session.lastVictim) min.v = session.lastVictim;
    if (session.lastCriminal) min.cr = session.lastCriminal;
    if (session.lastOfficer) min.o = session.lastOfficer;

    return JSON.stringify(min);
  }

  /**
   * Inflates minified database context metadata back to full session memory.
   */
  inflateContext(str) {
    if (!str) return null;
    try {
      const min = JSON.parse(str);
      const session = {
        lastIntent: min.i || null,
        lastCaseMasterId: min.cm || null,
        lastCrimeNo: min.cn || null,
        lastCaseNo: min.cNo || null,
        lastCriminal: min.cr || null,
        lastCriminalName: (min.cr && min.cr.name) ? min.cr.name : null,
        lastVictim: min.v || null,
        lastVictimName: (min.v && min.v.name) ? min.v.name : null,
        lastOfficer: min.o || null,
        lastOfficerName: (min.o && min.o.name) ? min.o.name : null
      };
      return session;
    } catch (e) {
      console.error('[ConversationService] Error inflating context JSON:', e.message);
      return null;
    }
  }

  /**
   * Starts a new conversation context.
   * 
   * @param {object} params - { sessionId, title }
   * @returns {Promise<object>} New conversation details
   */
  async startConversation(params) {
    const sessionId = params.sessionId || `session-${Date.now()}`;
    const title = params.title || 'New Investigation';

    const created = await this.repository.createConversation({
      SessionID: sessionId,
      Title: title,
      Status: 'ACTIVE',
      ContextMetadata: '{}'
    });

    return {
      conversationId: created.ROWID,
      sessionId: created.SessionID,
      title: created.Title
    };
  }

  /**
   * Lists all previous conversation titles for a SessionID.
   * 
   * @param {string} sessionId - User session
   * @returns {Promise<Array>} List of conversations
   */
  async getConversations(sessionId) {
    if (!sessionId) {
      const error = new Error('Bad Request: sessionId query parameter is required.');
      error.statusCode = 400;
      throw error;
    }

    const convos = await this.repository.listConversations(sessionId);
    return convos.map(c => ({
      conversationId: c.ROWID,
      sessionId: c.SessionID,
      title: c.Title,
      createdTime: c.CREATEDTIME
    }));
  }

  /**
   * Retrieves conversation details and all its messages.
   * 
   * @param {string|number} conversationId - Conversation row ID
   * @param {string} sessionId - User session ID
   * @returns {Promise<object>} Entire conversation payload
   */
  async getConversation(conversationId, sessionId) {
    if (!conversationId) {
      const error = new Error('Bad Request: ConversationID is required.');
      error.statusCode = 400;
      throw error;
    }

    const convo = await this.repository.findConversationById(conversationId);
    if (!convo || convo.Status !== 'ACTIVE') {
      const error = new Error('Conversation not found.');
      error.statusCode = 404;
      throw error;
    }

    // Security Check
    if (convo.SessionID !== sessionId) {
      const error = new Error('Security Mismatch: Unauthorized access to this conversation ID.');
      error.statusCode = 400;
      throw error;
    }

    const rawMsgs = await this.repository.listMessages(conversationId);
    const messages = rawMsgs.map(m => ({
      messageId: m.ROWID,
      role: m.Role,
      message: m.Message,
      timestamp: m.MsgTimestamp
    }));

    return {
      conversationId: convo.ROWID,
      sessionId: convo.SessionID,
      title: convo.Title,
      createdTime: convo.CREATEDTIME,
      messages
    };
  }

  /**
   * Restores memory state of an old conversation session.
   * 
   * @param {string|number} conversationId - Conversation row ID
   * @param {string} sessionId - Active session ID
   * @returns {Promise<object>} Restored session details
   */
  async continueConversation(conversationId, sessionId) {
    if (!conversationId) {
      const error = new Error('Bad Request: ConversationID is required.');
      error.statusCode = 400;
      throw error;
    }

    const convo = await this.repository.findConversationById(conversationId);
    if (!convo || convo.Status !== 'ACTIVE') {
      const error = new Error('Conversation not found.');
      error.statusCode = 404;
      throw error;
    }

    // Security Check
    if (convo.SessionID !== sessionId) {
      const error = new Error('Security Mismatch: Session ID mismatch for this conversation.');
      error.statusCode = 400;
      throw error;
    }

    // Restore memory inside backend SessionStore
    const restoredMemory = this.inflateContext(convo.ContextMetadata);
    if (restoredMemory) {
      SessionStore.updateSession(sessionId, restoredMemory);
      console.log(`[ConversationService] Restored memory context for session ${sessionId}:`, restoredMemory);
    } else {
      // Clear memory context if null or empty
      SessionStore.resetSession(sessionId);
    }

    return {
      conversationId: convo.ROWID,
      sessionId: convo.SessionID,
      title: convo.Title
    };
  }

  /**
   * Soft deletes a conversation by changing Status to DELETED.
   * 
   * @param {string|number} conversationId - Conversation ID
   * @param {string} sessionId - Validation session ID
   */
  async softDeleteConversation(conversationId, sessionId) {
    if (!conversationId) {
      const error = new Error('Bad Request: ConversationID is required.');
      error.statusCode = 400;
      throw error;
    }

    const convo = await this.repository.findConversationById(conversationId);
    if (!convo || convo.Status !== 'ACTIVE') {
      const error = new Error('Conversation not found.');
      error.statusCode = 404;
      throw error;
    }

    // Security Check
    if (convo.SessionID !== sessionId) {
      const error = new Error('Security Mismatch: Session ID mismatch.');
      error.statusCode = 400;
      throw error;
    }

    // Update Status
    await this.repository.updateConversation({
      ROWID: convo.ROWID,
      Status: 'DELETED'
    });
  }
}

module.exports = ConversationService;
