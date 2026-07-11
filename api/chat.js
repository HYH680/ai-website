// chat.js - POST /api/chat (SSE streaming)
const OpenAI = require('openai');
const config = require('./_lib/config');
const { handleCors, setCorsHeaders, parseBody, verifyToken } = require('./_lib/auth');
const {
  getConversationById,
  createConversation,
  createMessage,
  updateConversationTimestamp,
  getMessagesByConversation,
  updateUserBalance,
  getUserBalance,
  createTransaction
} = require('./_lib/db');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    setCorsHeaders(res);
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const user = await verifyToken(req);
    if (!user) {
      setCorsHeaders(res);
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '未登录或登录已过期' }));
      return;
    }

    const body = await parseBody(req);
    let { conversation_id, model, messages, stream } = body;

    if (!model) {
      setCorsHeaders(res);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '请选择模型' }));
      return;
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      setCorsHeaders(res);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '消息不能为空' }));
      return;
    }

    // Check user balance
    const balance = await getUserBalance(user.id);
    const minCost = 1; // minimum cost for a request
    if (balance < minCost) {
      setCorsHeaders(res);
      res.writeHead(402, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '余额不足，请充值或签到获取积分', balance }));
      return;
    }

    // Get or create conversation
    let conversation;
    if (conversation_id) {
      conversation = await getConversationById(conversation_id);
      if (!conversation || conversation.user_id !== user.id) {
        setCorsHeaders(res);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '对话不存在' }));
        return;
      }
    } else {
      const title = messages[0]?.content?.substring(0, 50) || '新对话';
      conversation = await createConversation(user.id, title, model);
      conversation_id = conversation.id;
    }

    // Save user's messages
    const userMessage = messages[messages.length - 1];
    if (userMessage) {
      await createMessage(conversation_id, 'user', userMessage.content);
    }

    // Build full message history
    const history = await getMessagesByConversation(conversation_id);
    const apiMessages = history.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiBaseUrl
    });

    let fullResponse = '';
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const streamResponse = await openai.chat.completions.create({
        model: model,
        messages: apiMessages,
        stream: true,
        max_tokens: 4096
      });

      for await (const chunk of streamResponse) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;

        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens || 0;
          outputTokens = chunk.usage.completion_tokens || 0;
        }

        // Estimate tokens if not provided by API
        if (!inputTokens && content) {
          inputTokens = Math.ceil(apiMessages.reduce((sum, m) => sum + m.content.length, 0) / 4);
        }

        if (content) {
          res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
        }
      }

      // Calculate final token counts
      if (!inputTokens) {
        inputTokens = Math.ceil(apiMessages.reduce((sum, m) => sum + m.content.length, 0) / 4);
      }
      if (!outputTokens) {
        outputTokens = Math.ceil(fullResponse.length / 3);
      }

      // Calculate cost
      const pricing = config.models[model] || { input: 1, output: 2 };
      const cost = Math.ceil(
        (inputTokens / 1000) * pricing.input +
        (outputTokens / 1000) * pricing.output
      );
      const actualCost = Math.max(cost, 1);

      // Save assistant message
      if (fullResponse) {
        await createMessage(conversation_id, 'assistant', fullResponse);
      }

      // Update conversation timestamp
      await updateConversationTimestamp(conversation_id);

      // Deduct tokens
      await updateUserBalance(user.id, -actualCost);
      await createTransaction(user.id, 'usage', -actualCost, `对话消耗 (${model})`);

      // Send completion event
      res.write(`data: ${JSON.stringify({
        content: '',
        done: true,
        conversation_id,
        usage: { input_tokens: inputTokens, output_tokens: outputTokens, cost: actualCost }
      })}\n\n`);
      res.end();

    } catch (apiErr) {
      console.error('OpenAI API error:', apiErr.message);
      res.write(`data: ${JSON.stringify({
        error: 'AI 服务暂时不可用，请稍后重试',
        detail: apiErr.message,
        done: true
      })}\n\n`);
      res.end();
    }

  } catch (err) {
    console.error('Chat error:', err);
    if (!res.headersSent) {
      setCorsHeaders(res);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '服务器内部错误' }));
    } else {
      res.write(`data: ${JSON.stringify({ error: '服务器内部错误', done: true })}\n\n`);
      res.end();
    }
  }
};
