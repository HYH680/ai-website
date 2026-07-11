const { updateUserBalance, createTransaction, findUserById } = require('./_lib/db');

// In production, this endpoint would be called by Alipay/WeChat Pay webhook
// See: https://opendocs.alipay.com/open/200/webhook
// See: https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_1_5.shtml
module.exports = async (req, res) => {
  const { handleCors, setCorsHeaders, parseBody } = require('./_lib/auth');
  if (handleCors(req, res)) return;
  setCorsHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await parseBody(req);
    const { orderId, userId, amount, type, plan, pkg } = body;

    // Validate signature (in production: verify Alipay/WeChat signature)
    console.log(`Payment callback received: order=${orderId}, userId=${userId}, amount=${amount}`);

    if (!userId || !amount) {
      return res.status(400).json({ error: 'Invalid callback data' });
    }

    let tokensToAdd = 0;
    let desc = '';

    const packages = [
      { id: 0, tokens: 5000, price: 9.9 },
      { id: 1, tokens: 15000, price: 29.9 },
      { id: 2, tokens: 50000, price: 79.9 },
      { id: 3, tokens: 200000, price: 199.9 }
    ];
    const plans = [
      { id: 'free', tokens: 10000 },
      { id: 'pro', tokens: 50000 },
      { id: 'ultimate', tokens: 200000 }
    ];

    if (type === 'package') {
      const pkgInfo = packages.find(p => p.id === pkg);
      tokensToAdd = pkgInfo ? pkgInfo.tokens : Math.round(amount * 500);
      desc = `积分套餐购买 +${tokensToAdd}`;
    } else if (type === 'plan') {
      const planInfo = plans.find(p => p.id === plan);
      tokensToAdd = planInfo ? planInfo.tokens : Math.round(amount * 500);
      desc = `会员升级 - ${plan}`;
    } else {
      tokensToAdd = Math.round(amount * 500);
      desc = `充值 +${tokensToAdd}`;
    }

    const newBalance = await updateUserBalance(userId, tokensToAdd);
    await createTransaction(userId, 'payment', tokensToAdd, desc);

    res.json({
      success: true,
      userId,
      amount: tokensToAdd,
      balance: newBalance,
      message: '支付成功！'
    });
  } catch (err) {
    console.error('Payment callback error:', err);
    res.status(500).json({ error: '回调处理失败' });
  }
};
