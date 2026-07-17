'use strict';

const ChatService = require('../services/chat.service');
const { sendJSON, sendError } = require('../utils/response');

class ChatController {
  constructor() {
    this.chatService = new ChatService();
  }

  /**
   * Handles POST /chat request.
   * 
   * @param {object} req - HTTP request object
   * @param {object} res - HTTP response object
   * @param {object} parsedBody - Already parsed JSON body
   */
  async handleChat(req, res, parsedBody) {
    try {
      const { message, sessionId, conversationId } = parsedBody;

      if (!message) {
        return sendError(res, 400, 'Bad Request: "message" field is required in request body.');
      }

      // Determine the dynamic base URL for internal API loopback calls
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}/server/foren_sight_function`;

      const responseText = await this.chatService.processChat(message, baseUrl, sessionId, req, conversationId);

      return sendJSON(res, 200, {
        response: responseText
      });
    } catch (error) {
      console.error('[ChatController] Error in handleChat:', error);
      
      const isConfigError = error.name === 'ConfigurationError' || error.message.includes('Configuration Error');
      const isQuotaError = error.name === 'QuotaExceededError' || error.status === 503;

      if (isConfigError) {
        return sendError(res, 500, 'Configuration Error: QUICKML_ENDPOINT_URL is not defined in the environment variables.');
      }

      if (isQuotaError) {
        return sendError(res, 503, 'QuickML quota exceeded. Please retry after the suggested delay.');
      }

      return sendError(res, 500, error.message || 'Internal Server Error in chat handler.');
    }
  }
}

module.exports = ChatController;
