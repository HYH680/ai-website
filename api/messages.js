// messages.js - GET /api/messages
const { handleCors, setCorsHeaders, requireAuth } = require('./_lib/auth');
const { getMessagesByConversation, getConversationById } = require('./_lib/db');

module.exports = requireAuth(async (req, res, user) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const conversation_id = url.searchParams.get('conversation_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!conversation_id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '缺少对话ID' }));
      return;
    }

    // Verify ownership
    const conversation = await getConversationById(conversation_id);
    if (!conversation || conversation.user_id !== user.id) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '对话不存在' }));
      return;
    }

    const messages = await getMessagesByConversation(conversation_id, limit, offset);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ messages, conversation }));
  } catch (err) {
    console.error('Get messages error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '获取消息失败' }));
  }
});
