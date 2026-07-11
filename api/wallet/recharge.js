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
    const { amount, method } = body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: '充值金额无效' });
    }
    const newBalance = await updateUserBalance(user.id, amount);
    await createTransaction(user.id, 'recharge', amount, method === 'alipay' ? '支付宝充值' : '积分充值');
    res.json({ success: true, amount, balance: newBalance, message: `充值成功 +${amount} 积分` });
  } catch (err) {
    console.error('Recharge error:', err);
    res.status(500).json({ error: '充值失败' });
  }
});
