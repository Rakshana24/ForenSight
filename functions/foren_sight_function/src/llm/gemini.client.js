'use strict';

const { GoogleGenAI } = require('@google/genai');
const GeminiModelManager = require('./model.manager');
const { retryWithBackoff } = require('../utils/retry');

class QuotaExceededError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QuotaExceededError';
    this.status = 503;
  }
}

class GeminiClient {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      throw new Error('Configuration Error: GEMINI_API_KEY is not defined in environment variables.');
    }
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  /**
   * Generates content and parses the response as JSON.
   * Wraps calls inside retryWithBackoff and cycles model if 503/429 occurs.
   * 
   * @param {string} prompt - Prompt instruction
   * @returns {Promise<object>} Parsed JSON response
   */
  async generateJSON(prompt) {
    try {
      return await retryWithBackoff(async () => {
        const model = await GeminiModelManager.getActiveModel();
        try {
          const response = await this.ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
          });

          console.log(`[GeminiClient Debug] generateJSON: text="${response.text}", candidates=${JSON.stringify(response.candidates)}`);

          if (response && response.text) {
            return JSON.parse(response.text.trim());
          }
          throw new Error('Received empty response from Gemini API');
        } catch (error) {
          const status = error.status || error.statusCode || (error.errorInfo && error.errorInfo.statusCode);
          const msg = (error.message || '').toLowerCase();
          
          if (status === 503 || status === 429 || msg.includes('resource_exhausted') || msg.includes('unavailable') || msg.includes('high demand')) {
            // Cycle model so next retry attempt uses the fallback model
            GeminiModelManager.cycleToNextModel();
          }
          throw error;
        }
      }, {
        maxRetries: 3,
        initialDelayMs: 1000
      });
    } catch (finalError) {
      const status = finalError.status || finalError.statusCode || (finalError.errorInfo && finalError.errorInfo.statusCode);
      const msg = (finalError.message || '').toLowerCase();
      
      if (status === 429 || msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('rate limit')) {
        console.warn(`[GeminiClient] Quota exhausted (429/RESOURCE_EXHAUSTED). Throwing QuotaExceededError.`);
        throw new QuotaExceededError('Gemini quota exceeded. Please retry after the suggested delay.');
      }
      throw finalError;
    }
  }

  /**
   * Generates standard text content.
   * Wraps calls inside retryWithBackoff and cycles model if 503/429 occurs.
   * 
   * @param {string} prompt - Prompt instruction
   * @returns {Promise<string>} Text response
   */
  async generateText(prompt) {
    try {
      return await retryWithBackoff(async () => {
        const model = await GeminiModelManager.getActiveModel();
        try {
          const response = await this.ai.models.generateContent({
            model: model,
            contents: prompt
          });

          console.log(`[GeminiClient Debug] generateText: text="${response.text}", candidates=${JSON.stringify(response.candidates)}`);

          if (response && response.text) {
            return response.text.trim();
          }
          throw new Error('Received empty response from Gemini API');
        } catch (error) {
          const status = error.status || error.statusCode || (error.errorInfo && error.errorInfo.statusCode);
          const msg = (error.message || '').toLowerCase();
          
          if (status === 503 || status === 429 || msg.includes('resource_exhausted') || msg.includes('unavailable') || msg.includes('high demand')) {
            // Cycle model so next retry attempt uses the fallback model
            GeminiModelManager.cycleToNextModel();
          }
          throw error;
        }
      }, {
        maxRetries: 3,
        initialDelayMs: 1000
      });
    } catch (finalError) {
      const status = finalError.status || finalError.statusCode || (finalError.errorInfo && finalError.errorInfo.statusCode);
      const msg = (finalError.message || '').toLowerCase();
      
      if (status === 429 || msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('rate limit')) {
        console.warn(`[GeminiClient] Quota exhausted (429/RESOURCE_EXHAUSTED). Throwing QuotaExceededError.`);
        throw new QuotaExceededError('Gemini quota exceeded. Please retry after the suggested delay.');
      }
      throw finalError;
    }
  }
}

module.exports = {
  GeminiClient,
  QuotaExceededError
};
