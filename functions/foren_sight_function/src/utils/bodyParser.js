'use strict';

/**
 * Parses the incoming HTTP request stream and returns the parsed JSON body.
 * 
 * @param {object} req - HTTP request object
 * @returns {Promise<object>} Parsed JSON body
 */
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', err => {
      reject(err);
    });
  });
}

module.exports = { parseRequestBody };
