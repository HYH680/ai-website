// api/admin/login.js - 管理员登录
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../_lib/config');
const { handleCors, setCorsHeaders, parseBody } = require('../_lib/auth');

// 默认管理员账号（首次部署可用，建议登录后修改密码）
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin888',
  email: 'admin@ai-website.com'
};

module.exports = async (req, res) => {
  handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await parseBody(req);
    const { username, password } = body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { role: 'admin', username: ADMIN_CREDENTIALS.username },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        username: ADMIN_CREDENTIALS.username,
        email: ADMIN_CREDENTIALS.email,
        role: 'admin'
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: '登录失败' });
  }
};
