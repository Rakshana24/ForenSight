'use strict';

/**
 * Helper to sleep for a given number of milliseconds.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Checks if the given error is retryable.
 * Retryable errors: 503 (Unavailable), 429 (Rate Limit/Quota), Network timeouts.
 * Non-retryable errors: 400 (Bad Request), 401 (Auth), 403 (Forbidden), 404 (Not Found).
 * 
 * @param {Error} error - Caught error object
 * @returns {boolean} True if the error is retryable
 */
function isRetryable(error) {
  const status = error.status || error.statusCode || (error.errorInfo && error.errorInfo.statusCode);
  if (status === 503 || status === 429) {
    return true;
  }

  const code = error.code || (error.errorInfo && error.errorInfo.code);
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return true;
  }

  const msg = (error.message || '').toLowerCase();
  if (
    msg.includes('high demand') || 
    msg.includes('unavailable') || 
    msg.includes('resource_exhausted') || 
    msg.includes('quota') || 
    msg.includes('rate limit') || 
    msg.includes('too many requests')
  ) {
    return true;
  }

  return false;
}

/**
 * Executes a function with exponential backoff and retries.
 * 
 * @param {Function} fn - Async function to run
 * @param {object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.initialDelayMs - Initial backoff delay in ms
 * @param {Function} [options.onRetry] - Callback invoked before each retry
 * @returns {Promise<any>} Response from the function
 */
async function retryWithBackoff(fn, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const initialDelayMs = options.initialDelayMs || 1000;
  const onRetry = options.onRetry;

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries || !isRetryable(error)) {
        throw error;
      }

      // Calculate exponential delay with small random jitter (between 0 and 200ms)
      const delay = (initialDelayMs * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 200);
      
      const status = error.status || error.statusCode || 'UNKNOWN';
      const msg = error.message || error;
      
      console.warn(`[Retry] Attempt ${attempt} failed with status/error: ${status} (${msg}). Retrying in ${delay}ms...`);
      
      if (onRetry) {
        onRetry(attempt, error, delay);
      }

      await sleep(delay);
    }
  }
}

module.exports = {
  retryWithBackoff,
  isRetryable
};
