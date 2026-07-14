'use strict';

const { dispatch } = require('./src/router');

module.exports = (req, res) => {
  dispatch(req, res);
};