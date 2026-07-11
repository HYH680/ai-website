// api/admin/dashboard.js - 管理后台数据看板
const { handleCors, setCorsHeaders, requireAuth } = require('../_lib/auth');
const {
  getSiteStats,
  getUsers,
  getUserBalance,
  findUserById,
  updateUserBalance,
  createTransaction,
  getConversationsByUser,
  getTransactionsByUser
} = require('../_lib/db');
const config = require('../_lib/config');

// Admin auth middleware
function adminAuth(handler) {
  return async (req, res) => {
    handleCors(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' });
    }

    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(authHeader.split(' ')[1], config.jwtSecret);
      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: '权限不足' });
      }
      req.admin = decoded;
      return handler(req, res);
    } catch (err) {
      return res.status(401).json({ error: '令牌无效或已过期' });
    }
  };
}

module.exports = adminAuth(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace('/api/admin/dashboard', '');

  // GET /api/admin/dashboard - 总览数据
  if (req.method === 'GET' && !path) {
    const stats = await getSiteStats();
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    res.json({
      stats: {
        ...stats,
        uptime: Math.floor(uptime),
        memoryUsage: Math.round(memory.heapUsed / 1024 / 1024) + ' MB',
        nodeVersion: process.version,
        platform: process.platform
      },
      config: {
        siteName: config.siteName,
        siteUrl: config.siteUrl,
        hasApiKey: !!config.openaiApiKey && config.openaiApiKey !== 'sk-your-key-here'
      }
    });
    return;
  }

  // GET /api/admin/dashboard/users - 用户管理
  if (req.method === 'GET' && path === '/users') {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const users = await getUsers(limit, offset);
    res.json({ users });
    return;
  }

  // POST /api/admin/dashboard/users/balance - 调整用户余额
  if (req.method === 'POST' && path === '/users/balance') {
    const body = await require('../_lib/auth').parseBody(req);
    const { userId, amount, reason } = body;
    if (!userId || !amount) return res.status(400).json({ error: '参数不完整' });
    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const newBalance = await updateUserBalance(userId, amount);
    await createTransaction(userId, 'admin', amount, reason || '管理员调整');
    res.json({ success: true, userId, amount, balance: newBalance, message: `已调整 ${amount} 积分` });
    return;
  }

  // GET /api/admin/dashboard/transactions - 交易记录
  if (req.method === 'GET' && path === '/transactions') {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const transactions = [];
    res.json({ transactions });
    return;
  }

  res.status(404).json({ error: 'Not found' });
});
