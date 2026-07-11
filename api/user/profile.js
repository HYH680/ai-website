const { handleCors, setCorsHeaders, requireAuth } = require('../_lib/auth');
const { findUserById, getUserBalance } = require('../_lib/db');
module.exports = requireAuth(async (req, res, user) => {
  handleCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const balance = await getUserBalance(user.id);
  res.json({ user: { ...user, balance } });
});
