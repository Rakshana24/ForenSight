'use strict';

const ConversationController = require('../controllers/conversation.controller');
const { parseRequestBody } = require('../utils/bodyParser');
const { sendError } = require('../utils/response');

const controller = new ConversationController();

/**
 * Route handler for all /conversation and /conversations endpoints.
 */
async function conversationRouteHandler(req, res) {
  const parsedUrl = req.url.split('?')[0];
  const method = req.method;
  
  try {
    // 1. POST /conversation/start
    if (method === 'POST' && parsedUrl === '/conversation/start') {
      const parsedBody = await parseRequestBody(req);
      return await controller.handleStartConversation(req, res, parsedBody);
    }
    
    // 2. GET /conversations
    if (method === 'GET' && parsedUrl === '/conversations') {
      return await controller.handleListConversations(req, res);
    }
    
    // 3a. GET /conversation/:conversationId/export/pdf
    if (method === 'GET' && parsedUrl.startsWith('/conversation/') && parsedUrl.endsWith('/export/pdf')) {
      return await controller.handleExportConversationPDF(req, res);
    }

    // 3. GET /conversation/:conversationId
    if (method === 'GET' && parsedUrl.startsWith('/conversation/') && !parsedUrl.endsWith('/continue')) {
      return await controller.handleGetConversation(req, res);
    }
    
    // 4. POST /conversation/:conversationId/continue
    if (method === 'POST' && parsedUrl.startsWith('/conversation/') && parsedUrl.endsWith('/continue')) {
      const parsedBody = await parseRequestBody(req);
      return await controller.handleContinueConversation(req, res, parsedBody);
    }
    
    // 5. DELETE /conversation/:conversationId
    if (method === 'DELETE' && parsedUrl.startsWith('/conversation/')) {
      const parsedBody = await parseRequestBody(req);
      return await controller.handleDeleteConversation(req, res, parsedBody);
    }
    
    return sendError(res, 404, 'Route not found');
  } catch (error) {
    console.error('[conversationRouteHandler] Route processing error:', error);
    return sendError(res, 400, `Bad Request: ${error.message || 'Error processing request.'}`);
  }
}

module.exports = conversationRouteHandler;
