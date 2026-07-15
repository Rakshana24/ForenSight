'use strict';

/**
 * Returns prompt for intent detection and parameter extraction with conversation memory context.
 * 
 * @param {string} message - User message
 * @param {object} sessionContext - Session memory context
 * @returns {string} Fully formatted prompt
 */
function getIntentDetectionPrompt(message, sessionContext) {
  const contextStr = sessionContext ? JSON.stringify(sessionContext, null, 2) : 'No previous context.';
  
  return `You are the intent detection and parameter extraction engine for the ForenSight Crime Intelligence platform.
Your task is to analyze the user's natural language input and extract the intent and parameters in a strict JSON format.

We have a lightweight session memory to support follow-up questions and reference resolution.
Session Context (Previous turn memory):
${contextStr}

Reference Resolution Rules:
1. If the user refers to previous items using pronouns or general references ("it", "he", "she", "that case", "him", "her", "his", "who investigated", "handled the case", etc.):
   - Use the Session Context to resolve the reference:
     - "Who investigated it?" / "Who was the investigator?" -> Resolves to the previous investigating officer. Map to SEARCH_OFFICER and copy officer details from Session Context (e.g., lastOfficerName).
     - "How many cases does he have?" / "his cases" -> Resolves to the previous criminal. Map to SEARCH_CRIMINAL and copy criminal details (e.g., lastCriminalName).
     - "Which police station handled the case?" / "Which station handled it?" -> Resolves to the previous case. Map to SEARCH_FIR and copy case details (e.g., lastCaseMasterId).
2. If the user uses pronouns ("he", "it", "that", etc.) or asks a reference-based question, but the Session Context is empty (all fields are null or empty), map the intent to CLARIFY.

Available Intents:
1. SEARCH_FIR: User is searching for case or FIR details.
   - Parameters: "crimeNo" (18-digit FIR/crime number), "caseNo" (shorter case/FIR registration code), or "caseID" (internal case ID from previous context).
2. SEARCH_CRIMINAL: User is searching for a criminal/accused profile.
   - Parameters: "criminalName" (accused name) or "accusedAId" (accused identifier like A1, A2).
3. SEARCH_VICTIM: User is searching for a victim profile.
   - Parameters: "victimName" (victim name).
4. SEARCH_OFFICER: User is searching for a police officer profile.
   - Parameters: "officerName" (officer's name), "badgeNumber" (KGID badge), or "officerID" (employee ID).
5. CLARIFY: The user used a pronoun reference but there is no previous context. No parameters required.
6. UNKNOWN: The input does not map to any of the above.

JSON Schema Output:
{
  "intent": "SEARCH_FIR" | "SEARCH_CRIMINAL" | "SEARCH_VICTIM" | "SEARCH_OFFICER" | "CLARIFY" | "UNKNOWN",
  "parameters": {
     "crimeNo": "string",
     "caseNo": "string",
     "caseID": "string",
     "criminalName": "string",
     "accusedAId": "string",
     "victimName": "string",
     "officerName": "string",
     "badgeNumber": "string",
     "officerID": "string"
  }
}

Respond ONLY with valid, raw, unquoted JSON matching the schema. No markdown formatting, no backticks, no comments, no explanations.

User Input: "${message}"`;
}

/**
 * Returns prompt to format the raw database response into a human-friendly answer.
 * 
 * @param {string} userMessage - User message
 * @param {object} apiResponse - Raw JSON response from backend
 * @param {object} sessionContext - Session memory context
 * @returns {string} Fully formatted prompt
 */
function getFormatResponsePrompt(userMessage, apiResponse, sessionContext) {
  const contextStr = sessionContext ? JSON.stringify(sessionContext, null, 2) : 'No previous context.';

  return `You are the Conversational Crime Intelligence Assistant for the ForenSight platform.
Your task is to take the user's question, the current session context, and the raw JSON response from our database, and format it into a polite, professional, conversational, and concise human-readable answer.

Rules:
1. Ground your response ONLY in the data provided in the JSON response or the session context. Do not invent any facts, suspects, victim names, or crime locations.
2. If the database response indicates an error or no record was found, explain that clearly to the user without making up placeholders.
3. Be concise, professional, and write in a natural conversational style.

Session Context:
${contextStr}

User Question: "${userMessage}"
Raw Database/API JSON Response:
${JSON.stringify(apiResponse, null, 2)}

Provide a clean, human-readable answer now.`;
}

module.exports = {
  getIntentDetectionPrompt,
  getFormatResponsePrompt
};
