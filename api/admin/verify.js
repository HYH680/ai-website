// api/admin/verify.js - 验证 admin token 是否有效
const config = require('../_lib/config');
const { handleCors, setCorsHeaders } = require('../_lib/auth');

module.exports = async (req, res) => {
  handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, error: '未授权' });
  }
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(authHeader.split(' ')[1], config.jwtSecret);
    if (decoded.role !== 'admin') return res.status(403).json({ valid: false });
    res.json({ valid: true, admin: { username: decoded.username } });
  } catch (err) {
    res.status(401).json({ valid: false, error: '令牌已过期' });
  }
};
