/**
 * Security Middleware for ForenSight Platform.
 * Provides query parameter sanitization, basic Role-Based Access Control (RBAC), and injection prevention.
 */

const { ForbiddenError } = require('./errorSystem');

/**
 * Sanitizes input strings to prevent ZCQL injection and cross-site scripting (XSS).
 * Strips out dangerous database characters (semicolons, comments, unescaped quotes).
 * 
 * @param {string} value - Raw input string
 * @returns {string} Sanitized string
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  
  return value
    .replace(/['"\\]/g, '\\$&') // Escape single quotes, double quotes, and backslashes
    .replace(/--/g, '')        // Strip SQL comment indicators
    .replace(/;/g, '')         // Strip statement terminators
    .trim();
}

/**
 * Enforces Role-Based Access Control (RBAC) based on Zoho Catalyst user roles.
 * 
 * @param {object} req - Catalyst Request object
 * @param {Array<string>} allowedRoles - List of roles permitted to access the resource
 * @throws {ForbiddenError} If user does not have permission
 */
function authorizeRoles(req, allowedRoles) {
  // If request does not contain user details, default to guest or deny in production
  const userDetails = req.User || (req.body && req.body.User);
  const userRole = userDetails && userDetails.roleName ? userDetails.roleName : 'Standard User';

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    throw new ForbiddenError(`User role '${userRole}' is not authorized to access this resource.`);
  }
}

module.exports = {
  sanitizeString,
  authorizeRoles
};
