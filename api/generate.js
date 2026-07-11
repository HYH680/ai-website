// generate.js - POST /api/generate (image generation)
const OpenAI = require('openai');
const config = require('./_lib/config');
const { handleCors, setCorsHeaders, parseBody, verifyToken } = require('./_lib/auth');
const {
  updateUserBalance,
  getUserBalance,
  createTransaction
} = require('./_lib/db');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const user = await verifyToken(req);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '未登录或登录已过期' }));
      return;
    }

    const body = await parseBody(req);
    const { prompt, size, quality, n } = body;

    if (!prompt) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '请提供图片描述' }));
      return;
    }

    // Check balance (2000 tokens per image)
    const costPerImage = 2000;
    const imageCount = n || 1;
    const totalCost = costPerImage * imageCount;
    const balance = await getUserBalance(user.id);

    if (balance < totalCost) {
      res.writeHead(402, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: '余额不足',
        required: totalCost,
        balance,
        costPerImage
      }));
      return;
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiBaseUrl
    });

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: Math.min(imageCount, 4),
      size: size || '1024x1024',
      quality: quality || 'standard',
      response_format: 'url'
    });

    const images = response.data.map(img => ({
      url: img.url,
      revised_prompt: img.revised_prompt || null
    }));

    // Deduct tokens
    const actualCost = totalCost;
    await updateUserBalance(user.id, -actualCost);
    await createTransaction(user.id, 'usage', -actualCost, `图片生成 (${prompt.substring(0, 50)})`);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      images,
      usage: { cost: actualCost, balance_remaining: balance - actualCost }
    }));

  } catch (err) {
    console.error('Generate image error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: '图片生成失败',
      detail: err.message
    }));
  }
};
