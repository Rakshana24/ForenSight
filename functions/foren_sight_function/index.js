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
  if (!result.error && process.env.QUICKML_ENDPOINT_URL) {
    envLoaded = true;
    break;
  }
}

// Log loaded status as required
console.log(process.env.QUICKML_ENDPOINT_URL ? "QuickML Endpoint URL Loaded Successfully" : "Missing QuickML Endpoint URL");

const { dispatch } = require('./src/router');

module.exports = (req, res) => {
  dispatch(req, res);
};