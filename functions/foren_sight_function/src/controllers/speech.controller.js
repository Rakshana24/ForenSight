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

  async handleTTS(req, res, parsedBody) {
    try {
      const { text, originalPrompt, isVoiceInput } = parsedBody;

      if (!text) {
        return sendError(res, 400, 'Missing "text" parameter in request body.');
      }

      // Condition 1: Originates from Voice Input
      if (!isVoiceInput) {
        return sendError(res, 400, 'Voice generation skipped: Message did not originate from Voice Input.');
      }

      // Condition 2: Normal chatbot conversation
      // NOT Timeline, NOT Case Summary, NOT Lead Recommendation, NOT Export, NOT History
      const lowerPrompt = (originalPrompt || '').trim().toLowerCase();
      const isSpecialCommand = 
        lowerPrompt.includes('summary') ||
        lowerPrompt.includes('timeline') ||
        lowerPrompt.includes('similar cases') ||
        lowerPrompt.includes('leads') ||
        lowerPrompt.includes('assessment') ||
        lowerPrompt.includes('export') ||
        lowerPrompt.includes('history');

      if (isSpecialCommand) {
        return sendError(res, 400, 'Voice generation skipped: Conversation type is not a normal chatbot query.');
      }

      const audioBuffer = await this.synthesizeTTSBuffer(req, text);

      res.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length
      });
      return res.end(audioBuffer);

    } catch (error) {
      console.error('[SpeechController] TTS Synthesis error:', error.message || error);
      return sendError(res, 500, `Unable to synthesize speech. Error: ${error.message || 'Unknown error'}`);
    }
  }

  async synthesizeTTSBuffer(req, text) {
    const fs = require('fs');
    try {
      fs.appendFileSync('d:\\Projects\\ForenSight\\debug.log', `[SpeechController] synthesizeTTSBuffer: text="${text.substring(0, 30)}..."\n`);
    } catch (e) {}

    // Load config defaults
    const ttsConfig = require('../config/tts.config');
    const voiceConfig = ttsConfig.default;

    // Initialize Catalyst App using request context
    const catalyst = require('zcatalyst-sdk-node');
    const app = catalyst.initialize(req);

    // Resolve Org ID
    const orgId = process.env.QUICKML_ORG_ID || process.env.X_ZOHO_CATALYST_ORG_ID;
    try {
      fs.appendFileSync('d:\\Projects\\ForenSight\\debug.log', `[SpeechController] Org ID resolved: "${orgId}"\n`);
    } catch (e) {}
    if (!orgId) {
      throw new Error('Configuration Error: QUICKML_ORG_ID is not defined in the environment variables.');
    }

    // Retrieve Access Token
    const tokenObj = await app.credential.getToken();
    const token = tokenObj.access_token;
    if (!token) {
      throw new Error('OAuth Token Error: Failed to retrieve access token from Catalyst SDK credential helper.');
    }

    // Clean markdown and formatting to prevent PATTERN_NOT_MATCHED from Zia TTS API
    const cleanText = text
      .replace(/\*\*/g, '')          // Remove bold markers (**)
      .replace(/\*/g, '')            // Remove italic markers (*)
      .replace(/#/g, '')             // Remove headers (#)
      .replace(/`/g, '')             // Remove backticks (`)
      .replace(/_/g, '')             // Remove underscores (_)
      .replace(/^[•*\-]\s+/gm, '')   // Remove bullet points at starts of lines
      .replace(/:\s*/g, ', ')        // Replace colons with a comma for better speech flow
      .replace(/\r?\n+/g, ' ')       // Replace newlines with spaces
      .replace(/\s+/g, ' ')          // Collapse multiple spaces to single space
      .trim();

    try {
      fs.appendFileSync('d:\\Projects\\ForenSight\\debug.log', `[SpeechController] cleanText for TTS: "${cleanText.substring(0, 50)}..."\n`);
    } catch (e) {}

    const url = 'https://api.catalyst.zoho.in/quickml/api/v1/models/zia/tts/synthesize';
    console.log(`[SpeechController] Requesting speech synthesis from Zia TTS API...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CATALYST-ORG': orgId,
        'Authorization': `Zoho-oauthtoken ${token}`
      },
      body: JSON.stringify({
        text: cleanText,
        language: voiceConfig.language,
        speaker: voiceConfig.speaker,
        pitch: voiceConfig.pitch,
        speed: voiceConfig.speed,
        emotion: voiceConfig.emotion
      })
    });

    if (!response.ok) {
      const responseBody = await response.json().catch(() => ({}));
      const errorMsg = responseBody.error || responseBody.message || `HTTP ${response.status}`;
      throw new Error(`Catalyst Zia Speech Synthesis Error: ${errorMsg}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    if (audioBuffer.length === 0) {
      throw new Error('Zia Speech Synthesis returned empty audio.');
    }

    return audioBuffer;
  }
}

module.exports = SpeechController;
