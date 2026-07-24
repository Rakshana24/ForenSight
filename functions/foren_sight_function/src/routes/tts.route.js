'use strict';

const SpeechController = require('../controllers/speech.controller');
const { parseRequestBody } = require('../utils/bodyParser');
const { sendError } = require('../utils/response');

const speechController = new SpeechController();

async function ttsRouteHandler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, `Method Not Allowed: Expected POST, received ${req.method}.`);
  }

  try {
    const parsedBody = await parseRequestBody(req);
    await speechController.handleTTS(req, res, parsedBody);
  } catch (error) {
    console.error('[ttsRouteHandler] Error processing POST request body:', error);
    return sendError(res, 400, `Bad Request: ${error.message || 'Could not parse request body.'}`);
  }
}

module.exports = ttsRouteHandler;
