// models.js - GET /api/models
const { handleCors, setCorsHeaders } = require('./_lib/auth');

const models = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'OpenAI 最新旗舰模型，支持多模态输入，性能最强',
    input_price: 5,
    output_price: 15,
    category: 'chat',
    capabilities: ['text', 'vision'],
    max_tokens: 128000
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: '轻量版 GPT-4o，性价比极高，适合日常对话',
    input_price: 0.15,
    output_price: 0.6,
    category: 'chat',
    capabilities: ['text'],
    max_tokens: 128000
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    description: 'GPT-4 增强版，支持更长的上下文',
    input_price: 10,
    output_price: 30,
    category: 'chat',
    capabilities: ['text'],
    max_tokens: 128000
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    description: 'Anthropic 智能模型，长文本理解和推理能力强',
    input_price: 3,
    output_price: 15,
    category: 'chat',
    capabilities: ['text'],
    max_tokens: 200000
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'DeepSeek',
    description: '国内开源模型，推理能力强，中文友好',
    input_price: 0.14,
    output_price: 0.28,
    category: 'chat',
    capabilities: ['text'],
    max_tokens: 32000
  },
  {
    id: 'qwen2.5-72b',
    name: 'Qwen 2.5 72B',
    provider: 'Alibaba',
    description: '通义千问大模型，中文理解和生成能力强',
    input_price: 1,
    output_price: 2,
    category: 'chat',
    capabilities: ['text'],
    max_tokens: 32000
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    description: 'AI 图像生成，根据描述生成高质量的图片',
    input_price: 0,
    output_price: 2000,
    category: 'image',
    capabilities: ['image-generation'],
    max_tokens: 0
  }
];

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ models }));
};
