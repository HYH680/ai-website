// api/admin/api-keys.js - API 密钥管理
const { handleCors, setCorsHeaders, parseBody } = require('../_lib/auth');
const config = require('../_lib/config');

const crypto = require('crypto');

// 内存存储（后续可移到数据库）
let apiKeys = [
  {
    key: 'sk-ai-website-' + crypto.randomBytes(16).toString('hex'),
    name: '默认 API 密钥',
    created: new Date().toISOString(),
    enabled: true,
    rateLimit: 1000
  }
];

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
      if (decoded.role !== 'admin') return res.status(403).json({ error: '权限不足' });
      req.admin = decoded;
      return handler(req, res);
    } catch (err) {
      return res.status(401).json({ error: '令牌无效' });
    }
  };
}

module.exports = adminAuth(async (req, res) => {
  if (req.method === 'GET') {
    const safeKeys = apiKeys.map(k => ({ ...k, key: k.key.substring(0, 19) + '...' + k.key.slice(-4) }));
    return res.json({ apiKeys: safeKeys, rawKeys: apiKeys.map(k => k.key) });
  }

  if (req.method === 'POST') {
    const body = await parseBody(req);
    const { action } = body;

    if (action === 'create') {
      const newKey = {
        key: 'sk-ai-website-' + crypto.randomBytes(24).toString('hex'),
        name: body.name || '新 API 密钥',
        created: new Date().toISOString(),
        enabled: true,
        rateLimit: body.rateLimit || 1000
      };
      apiKeys.push(newKey);
      return res.json({ success: true, apiKey: newKey, message: 'API 密钥已创建，请立即保存：' + newKey.key });
    }

    if (action === 'toggle') {
      const idx = apiKeys.findIndex(k => k.key === body.key);
      if (idx === -1) return res.status(404).json({ error: '密钥不存在' });
      apiKeys[idx].enabled = !apiKeys[idx].enabled;
      return res.json({ success: true, key: apiKeys[idx].key.substring(0, 19) + '...', enabled: apiKeys[idx].enabled });
    }

    if (action === 'delete') {
      apiKeys = apiKeys.filter(k => k.key !== body.key);
      return res.json({ success: true, message: '密钥已删除' });
    }

    return res.status(400).json({ error: '未知操作' });
  }

  res.status(405).json({ error: 'Method not allowed' });
});
