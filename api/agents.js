// agents.js - GET/POST /api/agents
const { handleCors, setCorsHeaders, parseBody, requireAuth } = require('./_lib/auth');
const { getAgents, createAgent } = require('./_lib/db');

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
    const agents = await getAgents();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ agents }));
  } catch (err) {
    console.error('Get agents error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '获取AI助手列表失败' }));
  }
}

async function handlePost(req, res, user) {
  try {
    const body = await parseBody(req);
    const { name, description, system_prompt, model, avatar, category } = body;

    if (!name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '助手名称不能为空' }));
      return;
    }

    const agent = await createAgent({
      name,
      description: description || '',
      system_prompt: system_prompt || '你是一个有用的AI助手。',
      model: model || 'gpt-4o-mini',
      avatar: avatar || '/agents/default.svg',
      category: category || 'custom'
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ agent }));
  } catch (err) {
    console.error('Create agent error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '创建AI助手失败' }));
  }
}
