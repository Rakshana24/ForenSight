'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the parent functions directory .env
const functionsRootEnv = path.resolve(__dirname, '..', '..', '..', '.env');
dotenv.config({ path: functionsRootEnv });

// Load environment variables from the function root directory .env
const functionRootEnv = path.resolve(__dirname, '..', '..', '.env');
dotenv.config({ path: functionRootEnv });

// Also load from process.cwd() as a fallback
dotenv.config();

const { GoogleGenAI } = require('@google/genai');

/**
 * Validates the presence of GEMINI_API_KEY.
 * Throws a clear configuration error if the key is missing or empty.
 */
function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Configuration Error: GEMINI_API_KEY is not defined in the environment variables.');
  }
  return apiKey;
}

/**
 * Initializes and returns a GoogleGenAI client.
 * Throws a configuration error if the API key is missing.
 */
function getGeminiClient() {
  const apiKey = getApiKey();
  return new GoogleGenAI({ apiKey });
}

/**
 * Verifies the Gemini connection by making a lightweight API call.
 * Returns { success: true, message: string } if successful.
 * Throws if there is a configuration, authentication, or connection issue.
 */
async function verifyGeminiConnection() {
  try {
    const ai = getGeminiClient();
    
    // We use a lightweight model call to verify connection.
    // gemini-3.5-flash is the modern standard fast model.
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'ping',
      config: {
        maxOutputTokens: 1
      }
    });

    if (response && (response.text !== undefined || response.candidates)) {
      return {
        success: true,
        message: 'Gemini connection verified successfully.'
      };
    }
    
    throw new Error('Received empty or unexpected response from Gemini API.');
  } catch (error) {
    // If the error was a missing API key config error, propagate it directly
    if (error.message && error.message.includes('Configuration Error')) {
      throw error;
    }
    
    // For other errors (e.g., invalid key, network timeout), format and throw
    throw new Error(`Gemini Connection Error: ${error.message || error}`);
  }
}

module.exports = {
  getGeminiClient,
  verifyGeminiConnection
};
