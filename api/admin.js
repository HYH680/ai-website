// admin.js - GET /api/admin
const { handleCors, setCorsHeaders, requireAuth } = require('./_lib/auth');
const { getSiteStats } = require('./_lib/db');

module.exports = requireAuth(async (req, res, user) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const stats = await getSiteStats();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      stats,
      site_name: require('./_lib/config').siteName
    }));
  } catch (err) {
    console.error('Admin stats error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '获取统计数据失败' }));
  }
});
