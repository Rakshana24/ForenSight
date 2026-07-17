'use strict';

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

function forceLoadEnv(envPath) {
  try {
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      for (const k in envConfig) {
        process.env[k] = envConfig[k];
      }
    }
  } catch (e) {
    console.error('Error force loading env:', e.message);
  }
}

// Load environment variables from the parent directories
const functionsRootEnv = path.resolve(__dirname, '..', '..', '..', '.env');
forceLoadEnv(functionsRootEnv);

const functionRootEnv = path.resolve(__dirname, '..', '..', '.env');
forceLoadEnv(functionRootEnv);

/**
 * Verifies the LLM connection by making a lightweight API call to QuickML.
 * 
 * @param {object} catalystApp - Initialized Catalyst app instance
 * @returns {Promise<object>} Status object { success: boolean, message: string }
 */
async function verifyLLMConnection(catalystApp) {
  try {
    const endpointUrl = process.env.QUICKML_ENDPOINT_URL;
    if (!endpointUrl || endpointUrl.trim() === '') {
      throw new Error('Configuration Error: QUICKML_ENDPOINT_URL is not defined in the environment variables.');
    }
    const orgId = process.env.QUICKML_ORG_ID || process.env.X_ZOHO_CATALYST_ORG_ID;
    if (!orgId || orgId.trim() === '') {
      throw new Error('Configuration Error: QUICKML_ORG_ID is not defined in the environment variables.');
    }

    const tokenObj = await catalystApp.credential.getToken();
    const token = tokenObj.access_token;
    if (!token) {
      throw new Error('OAuth Token Error: Failed to retrieve access token from Catalyst SDK.');
    }

    const headers = {
      'Content-Type': 'application/json',
      'CATALYST-ORG': orgId,
      'Authorization': `Zoho-oauthtoken ${token}`
    };

    const payload = {
      model: 'crm-di-glm47b_30b_it',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'ping'
        }
      ],
      temperature: 0.7,
      max_tokens: 100,
      stream: false
    };

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return {
        success: true,
        message: 'QuickML connection verified successfully.'
      };
    }
    
    const responseBody = await response.json().catch(() => ({}));
    throw new Error(`Received unexpected response from QuickML LLM serving: ${JSON.stringify(responseBody)}`);
  } catch (error) {
    if (error.message && error.message.includes('Configuration Error')) {
      throw error;
    }
    throw new Error(`QuickML Connection Error: ${error.message || error}`);
  }
}

module.exports = {
  verifyLLMConnection
};
