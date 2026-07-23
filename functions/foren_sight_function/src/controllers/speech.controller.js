'use strict';

const { sendJSON, sendError } = require('../utils/response');

class SpeechController {
  async handleTranscribe(req, res, parsedBody) {
    try {
      const { file: base64Audio, language = 'en' } = parsedBody;

      if (!base64Audio) {
        return sendError(res, 400, 'Missing audio file in request.');
      }

      // Extract raw base64 data and mime type
      const matches = base64Audio.match(/^data:(audio\/[a-zA-Z0-9]+);base64,(.*)$/);
      let mimeType = 'audio/webm';
      let rawBase64 = base64Audio;

      if (matches) {
        mimeType = matches[1];
        rawBase64 = matches[2].trim();
      }

      // Validate MIME type
      const allowedMimeTypes = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/mpeg'];
      if (!allowedMimeTypes.includes(mimeType)) {
        return sendError(res, 415, `Unsupported audio format: ${mimeType}`);
      }

      // Convert to binary Buffer
      const audioBuffer = Buffer.from(rawBase64, 'base64');
      if (audioBuffer.length === 0) {
        return sendError(res, 400, 'Audio recording is empty.');
      }

      // Initialize Catalyst App using the request context
      const catalyst = require('zcatalyst-sdk-node');
      const app = catalyst.initialize(req);
      
      // Resolve Org ID
      const orgId = process.env.QUICKML_ORG_ID || process.env.X_ZOHO_CATALYST_ORG_ID;
      if (!orgId) {
        return sendError(res, 500, 'Configuration Error: QUICKML_ORG_ID is not defined in the environment variables.');
      }

      // Get Zia Speech-to-Text Token
      const tokenObj = await app.credential.getToken();
      const token = tokenObj.access_token;
      if (!token) {
        return sendError(res, 500, 'OAuth Token Error: Failed to retrieve access token from Catalyst SDK credential helper.');
      }

      // Query Catalyst Speech to Text API
      const url = 'https://api.catalyst.zoho.in/quickml/api/v1/models/zia/audio/transcribe';
      
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: mimeType });
      let ext = (mimeType.split('/')[1] || 'wav').toLowerCase();
      if (ext === 'webm') ext = 'wav';
      formData.append('file', audioBlob, `recording.${ext}`);
      formData.append('language', language);

      console.log(`[SpeechController] Sending transcription request to Catalyst Zia STT API...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'CATALYST-ORG': orgId,
          'Authorization': `Zoho-oauthtoken ${token}`
        },
        body: formData
      });

      const responseBody = await response.json();
      console.log(`[SpeechController] Zia transcription response code: ${response.status}`);

      if (!response.ok) {
        const errorMsg = responseBody.error || responseBody.message || JSON.stringify(responseBody) || `HTTP ${response.status}`;
        console.error('[SpeechController] Zia STT API returned error:', errorMsg);
        return sendError(res, 500, `Catalyst Zia Speech Transcription Error: ${errorMsg}`);
      }

      // Send the transcribed text back to React
      return sendJSON(res, 200, {
        text: responseBody.text || ''
      });

    } catch (error) {
      console.error('[SpeechController] Transcription error:', error.message || error);
      return sendError(res, 500, `Unable to transcribe audio. Please try again. Error: ${error.message || 'Unknown error'}`);
    }
  }
}

module.exports = SpeechController;
