// me.js - GET /api/auth/me
const { handleCors, setCorsHeaders, requireAuth } = require('../_lib/auth');

module.exports = requireAuth(async (req, res, user) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar || '',
      balance: user.balance,
      created_at: user.created_at,
      last_checkin: user.last_checkin || null
    }
  }));
});
