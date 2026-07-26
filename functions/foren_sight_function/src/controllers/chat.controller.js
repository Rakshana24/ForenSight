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
      const { message, sessionId, conversationId, isVoiceInput } = parsedBody;

      const fs = require('fs');
      try {
        fs.appendFileSync('d:\\Projects\\ForenSight\\debug.log', `[ChatController] handleChat: message="${message}", isVoiceInput=${isVoiceInput}\n`);
      } catch (e) {}

      if (!message) {
        return sendError(res, 400, 'Bad Request: "message" field is required in request body.');
      }

      // Determine the dynamic base URL for internal API loopback calls
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}/server/foren_sight_function`;

      const responseText = await this.chatService.processChat(message, baseUrl, sessionId, req, conversationId);

      let audioBase64 = null;
      if (isVoiceInput) {
        // Condition 2: Normal chatbot conversation
        const lowerPrompt = (message || '').trim().toLowerCase();
        const isSpecialCommand = 
          lowerPrompt.includes('summary') ||
          lowerPrompt.includes('timeline') ||
          lowerPrompt.includes('similar cases') ||
          lowerPrompt.includes('leads') ||
          lowerPrompt.includes('assessment') ||
          lowerPrompt.includes('export') ||
          lowerPrompt.includes('history');

        try {
          fs.appendFileSync('d:\\Projects\\ForenSight\\debug.log', `[ChatController] isVoiceInput is true. isSpecialCommand=${isSpecialCommand}\n`);
        } catch (e) {}

        if (!isSpecialCommand) {
          // Clean only the voice payload of any markdown markers for natural voice synthesis
          const voicePayload = responseText
            .replace(/\*\*/g, '')          // Remove bold markers (**)
            .replace(/\*/g, '')            // Remove italic markers (*)
            .replace(/#/g, '')             // Remove headers (#)
            .replace(/`/g, '')             // Remove backticks (`)
            .replace(/_/g, '')             // Remove underscores (_)
            .replace(/^[•*\-]\s+/gm, '')   // Remove bullet points at starts of lines
            .replace(/:\s*/g, ', ')        // Replace colons with a comma for better speech flow
            .trim();

          try {
            const SpeechController = require('./speech.controller');
            const speechController = new SpeechController();
            const audioBuffer = await speechController.synthesizeTTSBuffer(req, voicePayload);
            if (audioBuffer && audioBuffer.length > 0) {
              audioBase64 = `data:audio/wav;base64,${audioBuffer.toString('base64')}`;
              try {
                fs.appendFileSync('d:\\Projects\\ForenSight\\debug.log', `[ChatController] TTS generated successfully, buffer size=${audioBuffer.length}\n`);
              } catch (e) {}
            }
          } catch (ttsErr) {
            try {
              fs.appendFileSync('d:\\Projects\\ForenSight\\debug.log', `[ChatController] TTS Error: ${ttsErr.message || ttsErr}\n`);
            } catch (e) {}
            console.error('[ChatController] Error generating simultaneous voice:', ttsErr.message || ttsErr);
          }
        }
      }

      return sendJSON(res, 200, {
        response: responseText,
        audio: audioBase64
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
