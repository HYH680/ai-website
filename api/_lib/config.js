// config.js - Environment configuration
const config = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
  jwtSecret: process.env.JWT_SECRET || 'ai-website-dev-secret-key-2024',
  siteName: process.env.SITE_NAME || 'AI 智能助手',
  databaseUrl: process.env.DATABASE_URL || '',
  isDev: !process.env.VERCEL || process.env.VERCEL_ENV === 'development',
  // Token pricing per 1K tokens (in token units)
  models: {
    'gpt-4o': { input: 5, output: 15 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'claude-3.5-sonnet': { input: 3, output: 15 },
    'deepseek-chat': { input: 0.14, output: 0.28 },
    'qwen2.5-72b': { input: 1, output: 2 },
    'dall-e-3': { input: 0, output: 2000 }
  }
};

module.exports = config;

// 管理员默认登录凭据
const adminCredentials = {
  username: 'admin',
  password: 'admin888'
};

module.exports = { ...module.exports, adminCredentials };
