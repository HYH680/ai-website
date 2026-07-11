const { handleCors, setCorsHeaders, parseBody, requireAuth } = require('./_lib/auth');
const { updateUserBalance, createTransaction } = require('./_lib/db');
const config = require('./_lib/config');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await parseBody(req);
    const { method, type, plan, pkg } = body;

    // Token package definitions
    const packages = [
      { id: 0, tokens: 5000, price: 9.9, label: "新手尝鲜包" },
      { id: 1, tokens: 15000, price: 29.9, label: "热门推荐包", popular: true },
      { id: 2, tokens: 50000, price: 79.9, label: "进阶畅用包" },
      { id: 3, tokens: 200000, price: 199.9, label: "专业极速包" }
    ];
    const plans = [
      { id: 'free', name: '免费版', price: 0, monthlyTokens: 10000 },
      { id: 'pro', name: '专业版', price: 29.9, monthlyTokens: 50000 },
      { id: 'ultimate', name: '旗舰版', price: 99.9, monthlyTokens: 200000 }
    ];

    let orderAmount = 0;
    let orderName = '';

    if (type === 'package' && pkg !== undefined) {
      const pkgInfo = packages.find(p => p.id === pkg);
      if (!pkgInfo) return res.status(400).json({ error: '无效的套餐' });
      orderAmount = pkgInfo.price;
      orderName = pkgInfo.label;
    } else if (type === 'plan' && plan) {
      const planInfo = plans.find(p => p.id === plan);
      if (!planInfo) return res.status(400).json({ error: '无效的方案' });
      orderAmount = planInfo.price;
      orderName = `${planInfo.name}会员`;
    } else {
      return res.status(400).json({ error: '缺少订单信息' });
    }

    // Generate mock order
    const orderId = 'ORD' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // In production, you would call real payment gateway API here
    // For Alipay: https://opendocs.alipay.com/apis
    // For WeChat Pay: https://pay.weixin.qq.com/wiki/doc/apiv3/
    
    // Mock QR code URL (in production, this would be a real payment QR)
    const qrData = JSON.stringify({
      orderId,
      amount: orderAmount,
      name: orderName,
      method: method || 'alipay',
      timestamp: new Date().toISOString()
    });
    const qrBase64 = Buffer.from(qrData).toString('base64');

    res.json({
      success: true,
      orderId,
      amount: orderAmount,
      name: orderName,
      method: method || 'alipay',
      qrData: qrBase64,
      // In production, replace these with real payment URLs/QR codes
      paymentUrl: method === 'wechat' 
        ? `weixin://pay/?order=${orderId}`
        : `https://openapi.alipay.com/gateway.do?order=${orderId}`,
      message: `订单已创建，请使用${method === 'wechat' ? '微信' : '支付宝'}扫码支付 ¥${orderAmount}`
    });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ error: '创建订单失败' });
  }
};
