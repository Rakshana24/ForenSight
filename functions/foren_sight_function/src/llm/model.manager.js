'use strict';

const path = require('path');

class GeminiModelManager {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelsCache = null;
    this.currentIndex = 0;
    this.lastFetched = 0;
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes cache TTL
  }

  /**
   * Helper to parse the version number from the model name (e.g. "models/gemini-1.5-flash" -> 1.5).
   * 
   * @param {string} name - Model name
   * @returns {number} Numeric version
   */
  _parseModelVersion(name) {
    // Matches "gemini-1.5-flash", "gemini-2.0-flash", etc.
    const match = name.match(/gemini-(\d+(?:\.\d+)?)-flash/i);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Fetches models from Google API and ranks them.
   */
  async fetchModels() {
    const now = Date.now();
    if (this.modelsCache && (now - this.lastFetched < this.cacheTTL)) {
      return this.modelsCache;
    }

    if (!this.apiKey) {
      throw new Error('Configuration Error: GEMINI_API_KEY is not defined in environment variables.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
    console.log(`[GeminiModelManager] Querying available models from API...`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch models! HTTP status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.models || !Array.isArray(data.models)) {
        throw new Error('Invalid response structure: "models" array is missing.');
      }

      // Filter:
      // 1. Must support "generateContent"
      // 2. Must contain "flash" in the name
      // 3. Exclude text/embeddings models or preview models if they don't support text generation
      const flashModels = data.models
        .filter(m => {
          const name = m.name || '';
          const methods = m.supportedGenerationMethods || [];
          return name.toLowerCase().includes('flash') && methods.includes('generateContent');
        })
        .map(m => m.name);

      if (flashModels.length === 0) {
        throw new Error('No Flash models found supporting generateContent.');
      }

      // Sort models: Newest version first (descending version order)
      flashModels.sort((a, b) => {
        return this._parseModelVersion(b) - this._parseModelVersion(a);
      });

      console.log(`[GeminiModelManager] Ranked available Flash models:`, flashModels);
      
      this.modelsCache = flashModels;
      this.lastFetched = now;
      this.currentIndex = 0; // Reset index on fresh fetch
      return this.modelsCache;
    } catch (error) {
      console.error(`[GeminiModelManager] Error fetching models:`, error.message || error);
      
      // If we have an existing cache, log and fallback to it rather than crashing
      if (this.modelsCache && this.modelsCache.length > 0) {
        console.warn(`[GeminiModelManager] Falling back to previously cached model list.`);
        return this.modelsCache;
      }
      
      // Hardcoded fallback list if the API is completely down/blocked on first load
      const hardcodedFallback = [
        'models/gemini-2.0-flash',
        'models/gemini-1.5-flash'
      ];
      console.warn(`[GeminiModelManager] API query failed. Using safe default fallbacks:`, hardcodedFallback);
      this.modelsCache = hardcodedFallback;
      this.lastFetched = now;
      this.currentIndex = 0;
      return this.modelsCache;
    }
  }

  /**
   * Returns the currently active model.
   * 
   * @returns {Promise<string>} The active model name (e.g. "models/gemini-2.0-flash")
   */
  async getActiveModel() {
    const list = await this.fetchModels();
    const model = list[this.currentIndex] || list[0] || 'models/gemini-1.5-flash';
    console.log(`[GeminiModelManager] Selected Gemini model: ${model} (Reason: Currently active ranked model)`);
    return model;
  }

  /**
   * Marks the current active model as failed or unavailable, cycling to the next best model.
   */
  cycleToNextModel() {
    if (!this.modelsCache || this.modelsCache.length === 0) return;
    
    const prevModel = this.modelsCache[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.modelsCache.length;
    const nextModel = this.modelsCache[this.currentIndex];
    
    console.warn(`[GeminiModelManager] Model ${prevModel} became unavailable. Cycled to next option: ${nextModel}`);
  }

  /**
   * Forces a refresh of the cache on the next fetch request.
   */
  refreshCache() {
    console.log(`[GeminiModelManager] Cache refresh requested.`);
    this.modelsCache = null;
    this.lastFetched = 0;
  }
}

// Singleton pattern so we share the cache and state across requests
module.exports = new GeminiModelManager();
