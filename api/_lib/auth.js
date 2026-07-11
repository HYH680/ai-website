// auth.js - JWT authentication middleware for Vercel serverless functions
const jwt = require('jsonwebtoken');
const config = require('./config');
const { findUserById } = require('./db');

/**
 * Extract and verify JWT token from request headers
 * Returns user object or null
 */
async function verifyToken(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await findUserById(decoded.userId);
    return user || null;
  } catch (err) {
    return null;
  }
}

/**
 * Middleware wrapper for protected routes.
 * Calls handler(req, res, user) if authenticated, or returns 401.
 */
function requireAuth(handler) {
  return async (req, res) => {
    try {
      const user = await verifyToken(req);
      if (!user) {
        res.writeHead(401, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end(JSON.stringify({ error: '未登录或登录已过期，请重新登录' }));
        return;
      }
      return handler(req, res, user);
    } catch (err) {
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: '服务器内部错误' }));
    }
  };
}

/**
 * Simple CORS handler for preflight requests
 */
function handleCors(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return true;
  }
  return false;
}

/**
 * Set CORS headers on response
 */
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

/**
 * Parse JSON body from request
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

module.exports = {
  verifyToken,
  requireAuth,
  handleCors,
  setCorsHeaders,
  parseBody
};
