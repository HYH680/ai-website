const { handleCors, setCorsHeaders, parseBody, requireAuth } = require('./_lib/auth');
const { updateUserBalance, createTransaction, getUserBalance } = require('./_lib/db');

module.exports = requireAuth(async (req, res, user) => {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = await parseBody(req);
    const { plan } = body;
    const plans = [
      { id: 'free', name: '免费版', price: 0 },
      { id: 'pro', name: '专业版', price: 29.9, monthlyTokens: 50000 },
      { id: 'ultimate', name: '旗舰版', price: 99.9, monthlyTokens: 200000 }
    ];
    const planInfo = plans.find(p => p.id === plan);
    if (!planInfo) return res.status(400).json({ error: '无效的套餐' });
    if (plan === 'free') {
      res.json({ success: true, plan: 'free', message: '已切换到免费版' });
    } else {
      res.json({ success: true, plan: planInfo.id, name: planInfo.name, price: planInfo.price, monthlyTokens: planInfo.monthlyTokens, message: `已升级到${planInfo.name}！` });
    }
  } catch (err) {
    res.status(500).json({ error: '升级失败' });
  }
});
