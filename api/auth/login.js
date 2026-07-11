// login.js - POST /api/auth/login
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../_lib/config');
const { handleCors, setCorsHeaders, parseBody } = require('../_lib/auth');
const { findUserByEmail } = require('../_lib/db');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = await parseBody(req);
    const { email, password } = body;

    if (!email || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '邮箱和密码不能为空' }));
      return;
    }

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '邮箱或密码不正确' }));
      return;
    }

    // Compare password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '邮箱或密码不正确' }));
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar || '',
        balance: user.balance,
        created_at: user.created_at
      }
    }));
  } catch (err) {
    console.error('Login error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '登录失败，请稍后重试' }));
  }
};
