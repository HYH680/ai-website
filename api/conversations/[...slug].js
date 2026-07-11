// conversations.js - GET/POST/DELETE /api/conversations
const { handleCors, setCorsHeaders, parseBody, requireAuth } = require('../_lib/auth');
const {
  getConversationsByUser,
  getConversationById,
  createConversation,
  deleteConversation
} = require('../_lib/db');

module.exports = requireAuth(async (req, res, user) => {
  // Parse slug from URL for /api/conversations/{id} routes
  const parsedUrl = new URL(req.url, 'http://localhost');
  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
  const convIdx = pathParts.indexOf('conversations') + 1;
  const slug = convIdx > 0 && convIdx < pathParts.length ? pathParts.slice(convIdx) : [];

  // Route with specific conversation ID
  if (slug.length > 0) {
    const convId = slug[0];
    if (req.method === 'GET') {
      return handleGetSingle(req, res, user, convId);
    }
    if (req.method === 'DELETE') {
      return handleDeleteById(req, res, user, convId);
    }
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // No slug - handle list/create/delete-by-body
  switch (req.method) {
    case 'GET': return handleGet(req, res, user);
    case 'POST': return handlePost(req, res, user);
    case 'DELETE': return handleDelete(req, res, user);
    default: res.status(405).json({ error: 'Method not allowed' });
  }
});

async function handleGet(req, res, user) {
  try {
    const conversations = await getConversationsByUser(user.id);
    res.json({ conversations });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: '获取对话列表失败' });
  }
}

async function handleGetSingle(req, res, user, conversationId) {
  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      res.status(404).json({ error: '对话不存在' });
      return;
    }
    res.json({ conversation });
  } catch (err) {
    console.error('Get conversation error:', err);
    res.status(500).json({ error: '获取对话失败' });
  }
}

async function handlePost(req, res, user) {
  try {
    const body = await parseBody(req);
    const { title, model } = body;
    if (!title) {
      res.status(400).json({ error: '对话标题不能为空' });
      return;
    }
    const conversation = await createConversation(user.id, title, model || 'gpt-4o-mini');
    res.json({ conversation });
  } catch (err) {
    console.error('Create conversation error:', err);
    res.status(500).json({ error: '创建对话失败' });
  }
}

async function handleDelete(req, res, user) {
  try {
    const body = await parseBody(req);
    const { conversation_id } = body;
    if (!conversation_id) {
      res.status(400).json({ error: '缺少对话ID' });
      return;
    }
    await deleteConversation(conversation_id);
    res.json({ success: true, message: '对话已删除' });
  } catch (err) {
    console.error('Delete conversation error:', err);
    res.status(500).json({ error: '删除对话失败' });
  }
}

async function handleDeleteById(req, res, user, conversationId) {
  try {
    await deleteConversation(conversationId);
    res.json({ success: true, message: '对话已删除' });
  } catch (err) {
    console.error('Delete conversation error:', err);
    res.status(500).json({ error: '删除对话失败' });
  }
}