// checkin.js - POST /api/checkin
const { handleCors, setCorsHeaders, requireAuth } = require('./_lib/auth');
const {
  getTodayCheckin,
  createCheckin,
  updateUserBalance,
  createTransaction
} = require('./_lib/db');

const CHECKIN_TOKENS = 100;

module.exports = requireAuth(async (req, res, user) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    // Check if already checked in today
    const existing = await getTodayCheckin(user.id);
    if (existing) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: '今天已签到',
        next_checkin: getNextCheckinTime()
      }));
      return;
    }

    // Create checkin record
    const checkin = await createCheckin(user.id, CHECKIN_TOKENS);

    // Add tokens
    const newBalance = await updateUserBalance(user.id, CHECKIN_TOKENS);
    await createTransaction(
      user.id,
      'checkin',
      CHECKIN_TOKENS,
      '每日签到奖励'
    );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      tokens_earned: CHECKIN_TOKENS,
      balance: newBalance,
      date: checkin.date,
      message: `签到成功！获得 ${CHECKIN_TOKENS} 积分`
    }));
  } catch (err) {
    console.error('Checkin error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '签到失败，请稍后重试' }));
  }
});

function getNextCheckinTime() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}
