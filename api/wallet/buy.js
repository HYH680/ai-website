const { handleCors, setCorsHeaders, parseBody, requireAuth } = require('../_lib/auth');
const { getUserBalance, updateUserBalance, createTransaction } = require('../_lib/db');

module.exports = requireAuth(async (req, res, user) => {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const body = await parseBody(req);
    const { pkg } = body;
    const packages = [
      { id: 0, tokens: 5000, price: 9.9 },
      { id: 1, tokens: 15000, price: 29.9, popular: true },
      { id: 2, tokens: 50000, price: 79.9 },
      { id: 3, tokens: 200000, price: 199.9 }
    ];
    const pkgInfo = packages.find(p => p.id === pkg);
    if (!pkgInfo) return res.status(400).json({ error: '无效的套餐' });
    const newBalance = await updateUserBalance(user.id, pkgInfo.tokens);
    await createTransaction(user.id, 'purchase', pkgInfo.tokens, `购买 ${pkgInfo.tokens} 积分套餐 ¥${pkgInfo.price}`);
    res.json({ success: true, tokens: pkgInfo.tokens, balance: newBalance, message: `购买成功 +${pkgInfo.tokens} 积分` });
  } catch (err) {
    console.error('Buy tokens error:', err);
    res.status(500).json({ error: '购买失败' });
  }
});
