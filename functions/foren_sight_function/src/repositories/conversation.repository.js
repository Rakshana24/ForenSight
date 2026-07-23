'use strict';

class ConversationRepository {
  /**
   * @param {object} app - Initialized Zoho Catalyst app instance
   */
  constructor(app) {
    this.app = app;
    this.zcql = app.zcql();
    this.datastore = app.datastore();
  }

  /**
   * Flattens the nested Zoho ZCQL JSON structure.
   */
  flattenRow(row) {
    if (!row) return null;
    let flattened = {};
    for (const [tableName, columns] of Object.entries(row)) {
      flattened = { ...flattened, ...columns };
    }
    return flattened;
  }

  /**
   * Inserts a new Conversation record.
   * 
   * @param {object} convoData - { SessionID, Title, Status, ContextMetadata }
   * @returns {Promise<object>} Inserted conversation row
   */
  async createConversation(convoData) {
    try {
      const table = this.datastore.table('Conversation');
      const result = await table.insertRow({
        SessionID: convoData.SessionID,
        Title: convoData.Title || 'New Investigation',
        Status: convoData.Status || 'ACTIVE',
        ContextMetadata: convoData.ContextMetadata || '{}'
      });
      return result;
    } catch (error) {
      console.error('[ConversationRepository] Error in createConversation:', error.message);
      throw error;
    }
  }

  /**
   * Updates an existing Conversation record.
   * 
   * @param {object} convoData - { ROWID, Title, Status, ContextMetadata }
   * @returns {Promise<object>} Updated conversation row
   */
  async updateConversation(convoData) {
    try {
      const table = this.datastore.table('Conversation');
      const result = await table.updateRow(convoData);
      return result;
    } catch (error) {
      console.error('[ConversationRepository] Error in updateConversation:', error.message);
      throw error;
    }
  }

  /**
   * Finds a conversation by its ROWID.
   * 
   * @param {string|number} conversationId - The database ROWID
   * @returns {Promise<object|null>} Conversation record or null
   */
  async findConversationById(conversationId) {
    try {
      const query = `SELECT * FROM Conversation WHERE ROWID = '${conversationId}'`;
      const result = await this.zcql.executeZCQLQuery(query);
      if (!result || result.length === 0) return null;
      return this.flattenRow(result[0]);
    } catch (error) {
      console.error('[ConversationRepository] Error in findConversationById:', error.message);
      throw error;
    }
  }

  /**
   * Lists all active conversations for a SessionID, sorted newest first.
   * 
   * @param {string} sessionId - Active investigator session ID
   * @returns {Promise<Array>} List of conversation records
   */
  async listConversations(sessionId) {
    try {
      const query = `
        SELECT * FROM Conversation 
        WHERE SessionID = '${sessionId.replace(/'/g, "''")}' 
        AND Status = 'ACTIVE' 
        ORDER BY CREATEDTIME DESC
      `;
      const rawRows = await this.zcql.executeZCQLQuery(query);
      if (!rawRows) return [];
      return rawRows.map(row => this.flattenRow(row));
    } catch (error) {
      console.error('[ConversationRepository] Error in listConversations:', error.message);
      throw error;
    }
  }

  /**
   * Inserts a message associated with a conversation.
   * 
   * @param {object} msgData - { ConversationID, Role, Message, MsgTimestamp }
   * @returns {Promise<object>} Inserted message record
   */
  async createMessage(msgData) {
    try {
      const table = this.datastore.table('ConversationMessage');
      const maxLen = 255;
      
      // If message is short enough, insert it directly
      if (msgData.Message.length <= maxLen) {
        const result = await table.insertRow({
          ConversationID: String(msgData.ConversationID),
          Role: msgData.Role,
          Message: msgData.Message,
          MsgTimestamp: msgData.MsgTimestamp || new Date().toISOString()
        });
        return result;
      }

      // If message is longer than 255, split it into chunks of 240 chars to leave space for prefix
      const chunkLen = 240;
      const text = msgData.Message;
      const chunks = [];
      for (let i = 0; i < text.length; i += chunkLen) {
        chunks.push(text.substring(i, i + chunkLen));
      }

      let firstResult = null;
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = `[part:${i}]${chunks[i]}`;
        const result = await table.insertRow({
          ConversationID: String(msgData.ConversationID),
          Role: msgData.Role,
          Message: chunkText,
          MsgTimestamp: msgData.MsgTimestamp || new Date().toISOString()
        });
        if (i === 0) {
          firstResult = result;
        }
      }
      return firstResult;
    } catch (error) {
      console.error('[ConversationRepository] Error in createMessage:', error.message);
      throw error;
    }
  }

  /**
   * Lists all messages for a specific conversation, sorted oldest first.
   * 
   * @param {string|number} conversationId - The parent conversation ROWID
   * @returns {Promise<Array>} List of message records
   */
  async listMessages(conversationId) {
    try {
      const query = `
        SELECT * FROM ConversationMessage 
        WHERE ConversationID = '${conversationId}' 
        ORDER BY CREATEDTIME ASC
      `;
      const rawRows = await this.zcql.executeZCQLQuery(query);
      if (!rawRows) return [];
      const messages = rawRows.map(row => this.flattenRow(row));
      return this.stitchMessages(messages);
    } catch (error) {
      console.error('[ConversationRepository] Error in listMessages:', error.message);
      throw error;
    }
  }

  /**
   * Helper to stitch chunked message parts (prefixed with [part:X]) back together.
   */
  stitchMessages(messages) {
    const stitched = [];
    let currentGroup = null;

    for (const m of messages) {
      const messageText = m.Message || '';
      const match = messageText.match(/^\[part:(\d+)\]([\s\S]*)$/);
      
      if (match) {
        const index = parseInt(match[1], 10);
        const content = match[2];
        
        if (index === 0) {
          if (currentGroup) {
            stitched.push(currentGroup);
          }
          currentGroup = {
            ...m,
            chunks: { [index]: content }
          };
        } else if (currentGroup && currentGroup.Role === m.Role) {
          currentGroup.chunks[index] = content;
        } else {
          if (currentGroup) {
            stitched.push(currentGroup);
            currentGroup = null;
          }
          stitched.push(m);
        }
      } else {
        if (currentGroup) {
          stitched.push(currentGroup);
          currentGroup = null;
        }
        stitched.push(m);
      }
    }
    
    if (currentGroup) {
      stitched.push(currentGroup);
    }

    return stitched.map(m => {
      if (m.chunks) {
        const sortedKeys = Object.keys(m.chunks).map(Number).sort((a, b) => a - b);
        const fullText = sortedKeys.map(k => m.chunks[k]).join('');
        delete m.chunks;
        return {
          ...m,
          Message: fullText
        };
      }
      return m;
    });
  }
}

module.exports = ConversationRepository;
