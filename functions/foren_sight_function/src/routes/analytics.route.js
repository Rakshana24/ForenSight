'use strict';

const catalyst = require('zcatalyst-sdk-node');
const url = require('url');
const AnalyticsService = require('../services/analytics.service');
const { sendJSON, sendError } = require('../utils/response');

const getTrendsHandler = async (req, res) => {
  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    
    const parsedUrl = url.parse(req.url, true);
    const { startDate, endDate, crimeType, district, policeStation, year, month } = parsedUrl.query;
    
    const analyticsService = new AnalyticsService(zcql);
    const trendData = await analyticsService.getTrendData({
      startDate,
      endDate,
      crimeType,
      district,
      policeStation,
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined
    });

    return sendJSON(res, 200, trendData);
  } catch (error) {
    console.error('[DEBUG] Analytics Trends API Exception:', error.stack || error);
    const statusCode = error.statusCode || 500;
    return sendError(res, statusCode, error.message);
  }
};

const getHotspotsHandler = async (req, res) => {
  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    
    const parsedUrl = url.parse(req.url, true);
    const { startDate, endDate, crimeType, crimeCategory, district, policeStation, year, month } = parsedUrl.query;
    
    const analyticsService = new AnalyticsService(zcql);
    const hotspotData = await analyticsService.getHotspotData({
      startDate,
      endDate,
      crimeType,
      crimeCategory,
      district,
      policeStation,
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined
    });

    return sendJSON(res, 200, hotspotData);
  } catch (error) {
    console.error('[DEBUG] Analytics Hotspots API Exception:', error.stack || error);
    const statusCode = error.statusCode || 500;
    return sendError(res, statusCode, error.message);
  }
};

const getFiltersHandler = async (req, res) => {
  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    
    const analyticsService = new AnalyticsService(zcql);
    const filterOptions = await analyticsService.getFilterOptions();

    return sendJSON(res, 200, filterOptions);
  } catch (error) {
    console.error('[DEBUG] Analytics Filters API Exception:', error.stack || error);
    const statusCode = error.statusCode || 500;
    return sendError(res, statusCode, error.message);
  }
};

module.exports = {
  getTrendsHandler,
  getHotspotsHandler,
  getFiltersHandler
};
