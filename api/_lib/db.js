// db.js - Database layer with Vercel Postgres + in-memory JSON fallback
const config = require('./config');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ── In-memory store for local dev ──
const memoryStore = {
  users: [],
  conversations: [],
  messages: [],
  agents: [],
  checkins: [],
  transactions: []
};

// ── Predefined agents ──
const defaultAgents = [
  {
    id: 'agent-writer',
    name: '写作助手',
    description: '专业的写作帮手，帮你完成各类文章、报告和创意写作',
    system_prompt: '你是一个专业的写作助手。你擅长各类文体写作，包括但不限于：文章、报告、邮件、创意故事、博客等。请根据用户需求提供高质量的写作帮助。',
    model: 'gpt-4o',
    avatar: '/agents/writer.svg',
    category: 'writing',
    created_at: new Date().toISOString()
  },
  {
    id: 'agent-coder',
    name: '编程专家',
    description: '资深程序员，精通多种编程语言和技术栈',
    system_prompt: '你是一个经验丰富的编程专家。你精通Python、JavaScript、TypeScript、Java、Go、Rust等多种语言，熟悉前后端开发、系统架构和最佳实践。请提供清晰、高效的代码解决方案。',
    model: 'gpt-4o',
    avatar: '/agents/coder.svg',
    category: 'coding',
    created_at: new Date().toISOString()
  },
  {
    id: 'agent-translator',
    name: '翻译官',
    description: '精通多国语言的翻译专家，准确传达原文含义',
    system_prompt: '你是一个专业的翻译专家。你精通中英文互译以及多种语言之间的翻译。请确保翻译准确、自然、符合目标语言的表达习惯。',
    model: 'gpt-4o-mini',
    avatar: '/agents/translator.svg',
    category: 'translation',
    created_at: new Date().toISOString()
  },
  {
    id: 'agent-marketer',
    name: '营销文案',
    description: '创意营销专家，打造爆款文案和营销策略',
    system_prompt: '你是一个创意营销专家。你擅长撰写营销文案、广告语、社交媒体内容、营销策略等。请结合市场趋势和用户需求，提供有创意、有影响力的营销方案。',
    model: 'gpt-4o',
    avatar: '/agents/marketer.svg',
    category: 'marketing',
    created_at: new Date().toISOString()
  },
  {
    id: 'agent-academic',
    name: '学术顾问',
    description: '学术研究助手，协助论文写作、文献分析和学术指导',
    system_prompt: '你是一个学术研究顾问。你擅长论文写作指导、文献综述、研究方法建议、学术规范咨询等。请提供专业、严谨的学术支持。',
    model: 'gpt-4o-mini',
    avatar: '/agents/academic.svg',
    category: 'academic',
    created_at: new Date().toISOString()
  },
  {
    id: 'agent-psychologist',
    name: '心理倾诉',
    description: '温暖的倾听者，提供情感支持和心理疏导',
    system_prompt: '你是一个温暖、善解人意的心理倾听者。你擅长倾听、共情和提供情感支持。请以温和、包容的态度与用户交流，提供专业的心理建议。注意：这不是医疗建议，如遇紧急情况请寻求专业帮助。',
    model: 'gpt-4o',
    avatar: '/agents/psychologist.svg',
    category: 'psychology',
    created_at: new Date().toISOString()
  }
];

// ── Postgres client (lazy init) ──
let sql = null;

async function getSql() {
  if (sql) return sql;
  if (config.databaseUrl) {
    try {
      const { createPool } = require('@vercel/postgres');
      sql = createPool({ connectionString: config.databaseUrl });
      await initPostgresTables();
      return sql;
    } catch (err) {
      console.warn('Postgres init failed, falling back to in-memory store:', err.message);
    }
  }
  return null;
}

async function initPostgresTables() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        avatar TEXT DEFAULT '',
        balance BIGINT DEFAULT 50000,
        created_at TIMESTAMP DEFAULT NOW(),
        last_checkin DATE
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        system_prompt TEXT,
        model TEXT,
        avatar TEXT DEFAULT '',
        category TEXT DEFAULT 'general',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS checkins (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        tokens_earned INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, date)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        amount BIGINT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    // Seed default agents if table is empty
    const existing = await sql`SELECT COUNT(*) as cnt FROM agents`;
    if (parseInt(existing[0].cnt) === 0) {
      for (const agent of defaultAgents) {
        await sql`
          INSERT INTO agents (id, name, description, system_prompt, model, avatar, category, created_at)
          VALUES (${agent.id}, ${agent.name}, ${agent.description}, ${agent.system_prompt}, ${agent.model}, ${agent.avatar}, ${agent.category}, ${agent.created_at})
        `;
      }
    }
  } catch (err) {
    console.error('Postgres table init error:', err.message);
    throw err;
  }
}

// ── Query helper ──
async function query(text, params) {
  const db = await getSql();
  if (db) {
    // Using template tag style; fallback to raw query for dynamic SQL
    if (params && params.length > 0) {
      return await db.unsafe(text, ...params);
    }
    return await db.unsafe(text);
  }
  throw new Error('No database connection available');
}

// ── User helpers ──
async function findUserByEmail(email) {
  const db = await getSql();
  if (db) {
    const result = await sql`SELECT * FROM users WHERE email = ${email}`;
    return result[0] || null;
  }
  return memoryStore.users.find(u => u.email === email) || null;
}

async function findUserById(id) {
  const db = await getSql();
  if (db) {
    const result = await sql`SELECT * FROM users WHERE id = ${id}`;
    return result[0] || null;
  }
  return memoryStore.users.find(u => u.id === id) || null;
}

async function createUser(email, password, name) {
  const id = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();
  const db = await getSql();
  if (db) {
    await sql`
      INSERT INTO users (id, email, password, name, balance, created_at)
      VALUES (${id}, ${email}, ${hashedPassword}, ${name || email.split('@')[0]}, 50000, ${now})
    `;
    return { id, email, name: name || email.split('@')[0], balance: 50000, created_at: now };
  }
  const user = {
    id,
    email,
    password: hashedPassword,
    name: name || email.split('@')[0],
    avatar: '',
    balance: 50000,
    created_at: now,
    last_checkin: null
  };
  memoryStore.users.push(user);
  return { id, email, name: name || email.split('@')[0], balance: 50000, created_at: now };
}

async function updateUserBalance(userId, amount) {
  const db = await getSql();
  if (db) {
    await sql`UPDATE users SET balance = balance + ${amount} WHERE id = ${userId}`;
    const result = await sql`SELECT balance FROM users WHERE id = ${userId}`;
    return result[0]?.balance || 0;
  }
  const user = memoryStore.users.find(u => u.id === userId);
  if (user) {
    user.balance += amount;
    return user.balance;
  }
  return 0;
}

async function getUserBalance(userId) {
  const db = await getSql();
  if (db) {
    const result = await sql`SELECT balance FROM users WHERE id = ${userId}`;
    return result[0]?.balance || 0;
  }
  const user = memoryStore.users.find(u => u.id === userId);
  return user ? user.balance : 0;
}

// ── Conversation helpers ──
async function createConversation(userId, title, model) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const db = await getSql();
  if (db) {
    await sql`
      INSERT INTO conversations (id, user_id, title, model, created_at, updated_at)
      VALUES (${id}, ${userId}, ${title}, ${model}, ${now}, ${now})
    `;
    return { id, user_id: userId, title, model, created_at: now, updated_at: now };
  }
  const conv = { id, user_id: userId, title, model, created_at: now, updated_at: now };
  memoryStore.conversations.push(conv);
  return conv;
}

async function getConversationsByUser(userId) {
  const db = await getSql();
  if (db) {
    const result = await sql`
      SELECT * FROM conversations WHERE user_id = ${userId} ORDER BY updated_at DESC
    `;
    return result;
  }
  return memoryStore.conversations
    .filter(c => c.user_id === userId)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

async function getConversationById(conversationId) {
  const db = await getSql();
  if (db) {
    const result = await sql`SELECT * FROM conversations WHERE id = ${conversationId}`;
    return result[0] || null;
  }
  return memoryStore.conversations.find(c => c.id === conversationId) || null;
}

async function deleteConversation(conversationId) {
  const db = await getSql();
  if (db) {
    await sql`DELETE FROM messages WHERE conversation_id = ${conversationId}`;
    await sql`DELETE FROM conversations WHERE id = ${conversationId}`;
    return;
  }
  memoryStore.messages = memoryStore.messages.filter(m => m.conversation_id !== conversationId);
  memoryStore.conversations = memoryStore.conversations.filter(c => c.id !== conversationId);
}

async function updateConversationTimestamp(conversationId) {
  const now = new Date().toISOString();
  const db = await getSql();
  if (db) {
    await sql`UPDATE conversations SET updated_at = ${now} WHERE id = ${conversationId}`;
    return;
  }
  const conv = memoryStore.conversations.find(c => c.id === conversationId);
  if (conv) conv.updated_at = now;
}

// ── Message helpers ──
async function createMessage(conversationId, role, content) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const db = await getSql();
  if (db) {
    await sql`
      INSERT INTO messages (id, conversation_id, role, content, created_at)
      VALUES (${id}, ${conversationId}, ${role}, ${content}, ${now})
    `;
    return { id, conversation_id: conversationId, role, content, created_at: now };
  }
  const msg = { id, conversation_id: conversationId, role, content, created_at: now };
  memoryStore.messages.push(msg);
  return msg;
}

async function getMessagesByConversation(conversationId, limit = 50, offset = 0) {
  const db = await getSql();
  if (db) {
    const result = await sql`
      SELECT * FROM messages WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC LIMIT ${limit} OFFSET ${offset}
    `;
    return result;
  }
  return memoryStore.messages
    .filter(m => m.conversation_id === conversationId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(offset, offset + limit);
}

// ── Agent helpers ──
async function getAgents() {
  const db = await getSql();
  if (db) {
    const result = await sql`SELECT * FROM agents ORDER BY created_at ASC`;
    return result;
  }
  return defaultAgents;
}

async function createAgent(data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const agent = {
    id,
    name: data.name,
    description: data.description || '',
    system_prompt: data.system_prompt || '',
    model: data.model || 'gpt-4o-mini',
    avatar: data.avatar || '/agents/default.svg',
    category: data.category || 'custom',
    created_at: now
  };
  const db = await getSql();
  if (db) {
    await sql`
      INSERT INTO agents (id, name, description, system_prompt, model, avatar, category, created_at)
      VALUES (${agent.id}, ${agent.name}, ${agent.description}, ${agent.system_prompt}, ${agent.model}, ${agent.avatar}, ${agent.category}, ${agent.created_at})
    `;
    return agent;
  }
  memoryStore.agents.push(agent);
  return agent;
}

// ── Check-in helpers ──
async function getTodayCheckin(userId) {
  const today = new Date().toISOString().split('T')[0];
  const db = await getSql();
  if (db) {
    const result = await sql`
      SELECT * FROM checkins WHERE user_id = ${userId} AND date = ${today}
    `;
    return result[0] || null;
  }
  return memoryStore.checkins.find(c => c.user_id === userId && c.date === today) || null;
}

async function createCheckin(userId, tokensEarned = 100) {
  const id = uuidv4();
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const db = await getSql();
  if (db) {
    await sql`
      INSERT INTO checkins (id, user_id, date, tokens_earned, created_at)
      VALUES (${id}, ${userId}, ${today}, ${tokensEarned}, ${now})
    `;
    return { id, date: today, tokens_earned: tokensEarned };
  }
  const checkin = { id, user_id: userId, date: today, tokens_earned: tokensEarned, created_at: now };
  memoryStore.checkins.push(checkin);
  return checkin;
}

// ── Transaction helpers ──
async function createTransaction(userId, type, amount, description) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const db = await getSql();
  if (db) {
    await sql`
      INSERT INTO transactions (id, user_id, type, amount, description, created_at)
      VALUES (${id}, ${userId}, ${type}, ${amount}, ${description}, ${now})
    `;
    return { id, user_id: userId, type, amount, description, created_at: now };
  }
  const tx = { id, user_id: userId, type, amount, description, created_at: now };
  memoryStore.transactions.push(tx);
  return tx;
}

async function getTransactionsByUser(userId, limit = 50, offset = 0) {
  const db = await getSql();
  if (db) {
    const result = await sql`
      SELECT * FROM transactions WHERE user_id = ${userId}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    return result;
  }
  return memoryStore.transactions
    .filter(t => t.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(offset, offset + limit);
}

// ── Stats helpers ──
async function getSiteStats() {
  const db = await getSql();
  if (db) {
    const users = await sql`SELECT COUNT(*) as count FROM users`;
    const conversations = await sql`SELECT COUNT(*) as count FROM conversations`;
    const txResult = await sql`SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE type = 'usage'`;
    return {
      userCount: parseInt(users[0].count),
      conversationCount: parseInt(conversations[0].count),
      totalTokensUsed: parseInt(txResult[0].total)
    };
  }
  const totalTokensUsed = memoryStore.transactions
    .filter(t => t.type === 'usage')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  return {
    userCount: memoryStore.users.length,
    conversationCount: memoryStore.conversations.length,
    totalTokensUsed
  };
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserBalance,
  getUserBalance,
  createConversation,
  getConversationsByUser,
  getConversationById,
  deleteConversation,
  updateConversationTimestamp,
  createMessage,
  getMessagesByConversation,
  getAgents,
  createAgent,
  getTodayCheckin,
  createCheckin,
  createTransaction,
  getTransactionsByUser,
  getSiteStats,
  query
};
