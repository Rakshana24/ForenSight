'use strict';

const path = require('path');
const dotenv = require('dotenv');

// Dynamically locate the .env file in the source directory even when executing in .build
const possibleEnvPaths = [
  path.resolve(__dirname, '.env'), // local source / build root .env
  path.resolve(__dirname, '..', '..', '..', 'functions', 'foren_sight_function', '.env'), // relative from .build/functions/foren_sight_function/
  path.resolve(process.cwd(), 'functions', 'foren_sight_function', '.env') // relative from workspace root process.cwd()
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error && process.env.GEMINI_API_KEY) {
    envLoaded = true;
    break;
  }
}

// Log loaded status as required
console.log(process.env.GEMINI_API_KEY ? "Gemini API Key Loaded Successfully" : "Missing Gemini API Key");

const { dispatch } = require('./src/router');

module.exports = (req, res) => {
  dispatch(req, res);
};