// wallet.js - GET/POST /api/wallet
const { handleCors, setCorsHeaders, parseBody, requireAuth } = require('./_lib/auth');
const {
  getUserBalance,
  getTransactionsByUser,
  updateUserBalance,
  createTransaction
} = require('./_lib/db');

module.exports = requireAuth(async (req, res, user) => {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res, user);
    case 'POST':
      return handlePost(req, res, user);
    default:
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
});

async function handleGet(req, res, user) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const balance = await getUserBalance(user.id);
    const transactions = await getTransactionsByUser(user.id, limit, offset);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      balance,
      transactions
    }));
  } catch (err) {
    console.error('Get wallet error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '获取钱包信息失败' }));
  }
}

async function handlePost(req, res, user) {
  try {
    const body = await parseBody(req);
    const { amount, description, secret } = body;

    // Admin secret for adding tokens (simple auth)
    if (secret !== 'admin-top-secret-2024') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '无权限执行此操作' }));
      return;
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '无效的金额' }));
      return;
    }

    const newBalance = await updateUserBalance(user.id, amount);
    await createTransaction(
      user.id,
      'recharge',
      amount,
      description || '积分充值'
    );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      amount,
      balance: newBalance,
      message: `成功添加 ${amount} 积分`
    }));
  } catch (err) {
    console.error('Wallet top-up error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '操作失败，请稍后重试' }));
  }
}
