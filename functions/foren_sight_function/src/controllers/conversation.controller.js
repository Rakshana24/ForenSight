'use strict';

const catalyst = require('zcatalyst-sdk-node');
const ConversationService = require('../services/conversation.service');
const { sendJSON, sendError } = require('../utils/response');
const url = require('url');

class ConversationController {
  /**
   * Helper to retrieve ConversationService initialized with Catalyst context.
   */
  getService(req) {
    const app = catalyst.initialize(req);
    return new ConversationService(app);
  }

  /**
   * POST /conversation/start
   */
  async handleStartConversation(req, res, parsedBody) {
    try {
      const service = this.getService(req);
      const result = await service.startConversation({
        sessionId: parsedBody.sessionId,
        title: parsedBody.title
      });

      return sendJSON(res, 201, {
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('[ConversationController] Error starting conversation:', error);
      const code = error.statusCode || 500;
      return sendError(res, code, error.message || 'Internal Server Error starting conversation.');
    }
  }

  /**
   * GET /conversations
   */
  async handleListConversations(req, res) {
    try {
      const parsedUrl = url.parse(req.url, true);
      const { sessionId } = parsedUrl.query;

      if (!sessionId) {
        return sendError(res, 400, 'Bad Request: "sessionId" query parameter is required.');
      }

      const service = this.getService(req);
      const result = await service.getConversations(sessionId);

      return sendJSON(res, 200, {
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('[ConversationController] Error listing conversations:', error);
      const code = error.statusCode || 500;
      return sendError(res, code, error.message || 'Internal Server Error listing conversations.');
    }
  }

  /**
   * GET /conversation/:conversationId
   */
  async handleGetConversation(req, res) {
    try {
      const parsedUrl = url.parse(req.url, true);
      const { sessionId } = parsedUrl.query;
      const { conversationId } = req.params || {};

      if (!sessionId) {
        return sendError(res, 400, 'Bad Request: "sessionId" query parameter is required.');
      }

      const service = this.getService(req);
      const result = await service.getConversation(conversationId, sessionId);

      return sendJSON(res, 200, {
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('[ConversationController] Error getting conversation details:', error);
      const code = error.statusCode || 500;
      return sendError(res, code, error.message || 'Internal Server Error fetching conversation details.');
    }
  }

  /**
   * POST /conversation/:conversationId/continue
   */
  async handleContinueConversation(req, res, parsedBody) {
    try {
      const { sessionId } = parsedBody;
      const { conversationId } = req.params || {};

      if (!sessionId) {
        return sendError(res, 400, 'Bad Request: "sessionId" is required in request body.');
      }

      const service = this.getService(req);
      const result = await service.continueConversation(conversationId, sessionId);

      return sendJSON(res, 200, {
        status: 'success',
        message: 'Conversation restored successfully.',
        data: result
      });
    } catch (error) {
      console.error('[ConversationController] Error continuing conversation:', error);
      const code = error.statusCode || 500;
      return sendError(res, code, error.message || 'Internal Server Error restoring conversation context.');
    }
  }

  /**
   * DELETE /conversation/:conversationId
   */
  async handleDeleteConversation(req, res, parsedBody) {
    try {
      const { sessionId } = parsedBody;
      const { conversationId } = req.params || {};

      if (!sessionId) {
        return sendError(res, 400, 'Bad Request: "sessionId" is required in request body.');
      }

      const service = this.getService(req);
      await service.softDeleteConversation(conversationId, sessionId);

      return sendJSON(res, 200, {
        status: 'success',
        message: 'Conversation deleted successfully.'
      });
    } catch (error) {
      console.error('[ConversationController] Error deleting conversation:', error);
      const code = error.statusCode || 500;
      return sendError(res, code, error.message || 'Internal Server Error deleting conversation.');
    }
  }
}

module.exports = ConversationController;
