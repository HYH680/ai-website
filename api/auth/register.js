// register.js - POST /api/auth/register
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../_lib/config');
const { handleCors, setCorsHeaders, parseBody } = require('../_lib/auth');
const { findUserByEmail, createUser } = require('../_lib/db');

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
    const { email, password, name } = body;

    // Validate
    if (!email || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '邮箱和密码不能为空' }));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '邮箱格式不正确' }));
      return;
    }

    if (password.length < 6) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '密码长度不能少于6位' }));
      return;
    }

    // Check duplicate
    const existing = await findUserByEmail(email);
    if (existing) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '该邮箱已被注册' }));
      return;
    }

    // Create user
    const user = await createUser(email, password, name);

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
        balance: user.balance,
        created_at: user.created_at
      }
    }));
  } catch (err) {
    console.error('Register error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '注册失败，请稍后重试' }));
  }
};
