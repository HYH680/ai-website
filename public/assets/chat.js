/* ============================================================
   chat.js - Chat Module
   ============================================================ */

var Chat = (function() {
  'use strict';

  var currentAbortController = null;
  var welcomeTips = [
    '我可以帮你写代码、翻译、总结文章',
    '支持图片识别和文件上传',
    '开启联网搜索获取最新信息',
    '使用 Deep Think 模式获得更深入的分析',
    '支持多种 AI 模型切换'
  ];

  function init() {
    renderWelcome();
    renderConversations();
  }

  function renderWelcome() {
    var container = document.getElementById('message-list');
    if (!container) return;
    
    // Only show welcome if no conversation
    if (State.currentConv && State.currentConv.messages && State.currentConv.messages.length > 0) {
      renderMessages();
      return;
    }

    var randomTip = welcomeTips[Math.floor(Math.random() * welcomeTips.length)];
    var isLoggedIn = !!State.token;
    
    var html = '';
    html += '<div class="welcome-screen" id="welcome-screen">';
    
    // Hero Section
    html += '  <div class="welcome-hero">';
    html += '    <div class="welcome-logo">AI</div>';
    html += '    <div class="welcome-title">AI 智能助手</div>';
    html += '    <div class="welcome-subtitle">' + randomTip + '</div>';
    
    if (!isLoggedIn) {
      html += '    <div class="welcome-cta">';
      html += '      <button class="welcome-btn primary" onclick="Auth.showRegister()">免费注册 →</button>';
      html += '      <button class="welcome-btn secondary" onclick="Auth.showLogin()">登录</button>';
      html += '    </div>';
      html += '    <div class="welcome-bonus">🎁 注册即送 <strong>50,000</strong> 积分，立即开始体验</div>';
    }
    html += '  </div>';

    // Stats Row
    html += '  <div class="welcome-stats">';
    html += '    <div class="stat-item"><span class="stat-num">10,000+</span><span class="stat-label">活跃用户</span></div>';
    html += '    <div class="stat-item"><span class="stat-num">500,000+</span><span class="stat-label">对话次数</span></div>';
    html += '    <div class="stat-item"><span class="stat-num">7</span><span class="stat-label">支持模型</span></div>';
    html += '    <div class="stat-item"><span class="stat-num">99.9%</span><span class="stat-label">服务可用率</span></div>';
    html += '  </div>';

    // Feature Grid
    html += '  <div class="welcome-features">';
    html += '    <div class="feature-card" onclick="Chat.newConversation()">';
    html += '      <div class="feature-icon">💬</div>';
    html += '      <div class="feature-title">AI 对话</div>';
    html += '      <div class="feature-desc">多模型智能对话，支持GPT-4o、Claude、DeepSeek等</div>';
    html += '    </div>';
    html += '    <div class="feature-card" onclick="Router.switchView(\'studio\')">';
    html += '      <div class="feature-icon">🎨</div>';
    html += '      <div class="feature-title">AI 绘画</div>';
    html += '      <div class="feature-desc">文字生成图片，多风格多比例，免费创作</div>';
    html += '    </div>';
    html += '    <div class="feature-card" onclick="Chat.newConversation()">';
    html += '      <div class="feature-icon">🧠</div>';
    html += '      <div class="feature-title">深度思考</div>';
    html += '      <div class="feature-desc">展示AI推理过程，答案更可靠</div>';
    html += '    </div>';
    html += '    <div class="feature-card" onclick="Chat.newConversation()">';
    html += '      <div class="feature-icon">🌐</div>';
    html += '      <div class="feature-title">联网搜索</div>';
    html += '      <div class="feature-desc">实时联网获取最新信息</div>';
    html += '    </div>';
    html += '    <div class="feature-card" onclick="Router.switchView(\'pricing\')">';
    html += '      <div class="feature-icon">🛡️</div>';
    html += '      <div class="feature-title">积分体系</div>';
    html += '      <div class="feature-desc">注册送50000积分，每日签到续费</div>';
    html += '    </div>';
    html += '    <div class="feature-card" onclick="Chat.newConversation()">';
    html += '      <div class="feature-icon">🧩</div>';
    html += '      <div class="feature-title">智能体</div>';
    html += '      <div class="feature-desc">多角色AI助手，写作编程翻译全能</div>';
    html += '    </div>';
    html += '  </div>';

    // Suggestions
    html += '  <div class="welcome-section-title">试试这些</div>';
    html += '  <div class="suggestion-grid">';
    
    var suggestions = [
      { icon: '✍️', title: '写一篇短文', desc: '关于人工智能的未来发展' },
      { icon: '💻', title: '帮我调试代码', desc: '解释这段代码哪里有问题' },
      { icon: '🌐', title: '翻译这段文字', desc: '翻译成英文' },
      { icon: '📝', title: '总结要点', desc: '总结这篇文章的核心内容' }
    ];
    
    suggestions.forEach(function(s) {
      html += '    <div class="suggestion-card" onclick="Chat.sendSuggestion(\'' + s.title + ' ' + s.desc + '\')">';
      html += '      <div class="suggestion-icon">' + s.icon + '</div>';
      html += '      <div class="suggestion-title">' + s.title + '</div>';
      html += '      <div class="suggestion-desc">' + s.desc + '</div>';
      html += '    </div>';
    });
    
    html += '  </div>';

    // Testimonials
    html += '  <div class="welcome-section-title">用户评价</div>';
    html += '  <div class="welcome-testimonials">';
    html += '    <div class="testimonial-card"><div class="testi-stars">⭐⭐⭐⭐⭐</div><div class="testi-text">"对话效果很棒，比某些付费的还好用！"</div><div class="testi-author">— 张**</div></div>';
    html += '    <div class="testimonial-card"><div class="testi-stars">⭐⭐⭐⭐⭐</div><div class="testi-text">"免费注册送5万积分，够用好久了！"</div><div class="testi-author">— 李**</div></div>';
    html += '    <div class="testimonial-card"><div class="testi-stars">⭐⭐⭐⭐</div><div class="testi-text">"生图功能很赞，风格多样化很棒"</div><div class="testi-author">— 王**</div></div>';
    html += '  </div>';

    // Footer
    if (!isLoggedIn) {
      html += '  <div class="welcome-footer">';
      html += '    <button class="welcome-btn primary large" onclick="Auth.showRegister()">🚀 免费注册，开始使用</button>';
      html += '  </div>';
    }

    html += '</div>';
    
    container.innerHTML = html;
  }

  function sendSuggestion(text) {
    var composer = document.getElementById('composer-textarea');
    if (composer) {
      composer.value = text;
      composer.style.height = 'auto';
      composer.style.height = Math.min(composer.scrollHeight, 200) + 'px';
      sendMessage();
    }
  }

  function renderConversations() {
    var container = document.getElementById('conversation-list');
    if (!container) return;
    
    if (!State.conversations || State.conversations.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:20px;font-size:12px;color:var(--sidebar-text-secondary)">暂无对话</div>';
      return;
    }
    
    var html = '';
    State.conversations.forEach(function(conv) {
      var active = conv.id === State.currentConvId ? 'active' : '';
      var title = conv.title || '新对话';
      html += '<div class="conv-item ' + active + '" onclick="Chat.switchConversation(\'' + conv.id + '\')">';
      html += '  <span class="conv-icon">💬</span>';
      html += '  <span class="conv-title">' + escapeHtml(title) + '</span>';
      html += '  <button class="conv-delete" onclick="event.stopPropagation();Chat.deleteConversation(\'' + conv.id + '\')">✕</button>';
      html += '</div>';
    });
    
    container.innerHTML = html;
  }

  function renderMessages() {
    var container = document.getElementById('message-list');
    if (!container) return;
    
    var conv = State.currentConv;
    if (!conv || !conv.messages || conv.messages.length === 0) {
      renderWelcome();
      return;
    }
    
    var html = '';
    conv.messages.forEach(function(msg, idx) {
      html += renderMessage(msg, idx);
    });
    
    container.innerHTML = html;
    scrollToBottom();
  }

  function renderMessage(msg, idx) {
    var role = msg.role || 'user';
    var content = msg.content || '';
    var model = msg.model || '';
    var reasoning = msg.reasoning || '';
    var imageUrl = msg.image || '';
    
    var avatarClass = role === 'user' ? 'user' : (role === 'system' ? 'system' : 'assistant');
    var avatarIcon = role === 'user' ? 'U' : (role === 'system' ? '!' : 'AI');
    
    var html = '';
    html += '<div class="message ' + avatarClass + '" data-idx="' + idx + '">';
    html += '  <div class="msg-avatar">' + avatarIcon + '</div>';
    html += '  <div class="msg-content">';
    
    if (model && role === 'assistant') {
      html += '    <div class="msg-model-badge">' + escapeHtml(model) + '</div>';
    }
    
    if (imageUrl) {
      html += '    <img class="msg-image" src="' + escapeHtml(imageUrl) + '" alt="用户图片" onclick="window.open(this.src)">';
    }
    
    if (reasoning) {
      html += '    <div class="thinking-section">';
      html += '      <div class="thinking-header" onclick="this.nextElementSibling.classList.toggle(\'open\');this.querySelector(\'.thinking-toggle\').classList.toggle(\'open\')">';
      html += '        <span class="thinking-toggle">▶</span>';
      html += '        <span>已思考 (' + (reasoning.length > 50 ? reasoning.substring(0, 50) + '...' : reasoning) + ')</span>';
      html += '      </div>';
      html += '      <div class="thinking-body">' + escapeHtml(reasoning) + '</div>';
      html += '    </div>';
    }
    
    var renderedContent = '';
    if (role === 'assistant' && window.marked) {
      var sanitized = window.DOMPurify ? window.DOMPurify.sanitize(window.marked(content)) : window.marked(content);
      renderedContent = sanitized;
    } else {
      renderedContent = '<p>' + escapeHtml(content).replace(/\n/g, '<br>') + '</p>';
    }
    
    html += '    <div class="msg-bubble">' + renderedContent + '</div>';
    html += '  </div>';
    html += '</div>';
    
    return html;
  }

  function addMessage(role, content, opts) {
    opts = opts || {};
    
    if (!State.currentConv) {
      // Create new conversation
      var conv = {
        id: generateId(),
        title: '新对话',
        messages: [],
        model: State.currentModel,
        agent: State.currentAgent,
        createdAt: new Date().toISOString()
      };
      State.addConversation(conv);
    }
    
    var msg = {
      role: role,
      content: content,
      model: opts.model || State.currentModel,
      timestamp: new Date().toISOString()
    };
    
    if (opts.reasoning) msg.reasoning = opts.reasoning;
    if (opts.image) msg.image = opts.image;
    
    State.currentConv.messages.push(msg);
    State.updateConversation(State.currentConvId, { messages: State.currentConv.messages });
    
    renderMessages();
    renderConversations();
    
    // Auto-generate title from first user message
    if (State.currentConv.messages.length === 1 && !State.currentConv.title || State.currentConv.title === '新对话') {
      generateTitle(content);
    }
  }

  function updateLastMessage(content, reasoning) {
    if (!State.currentConv || !State.currentConv.messages.length) return;
    var lastMsg = State.currentConv.messages[State.currentConv.messages.length - 1];
    if (lastMsg.role === 'assistant') {
      lastMsg.content = content;
      if (reasoning) lastMsg.reasoning = reasoning;
      State.updateConversation(State.currentConvId, { messages: State.currentConv.messages });
      
      // Update the rendered message
      var msgEl = document.querySelector('.message:last-child .msg-bubble');
      if (msgEl && window.marked) {
        var sanitized = window.DOMPurify ? window.DOMPurify.sanitize(window.marked(content)) : window.marked(content);
        // Remove streaming cursor if present
        sanitized = sanitized.replace('<span class="streaming-cursor"></span>', '');
        msgEl.innerHTML = sanitized;
        // Re-add cursor
        msgEl.innerHTML += '<span class="streaming-cursor"></span>';
      }
    }
  }

  function finalizeLastMessage(content, reasoning) {
    if (!State.currentConv || !State.currentConv.messages.length) return;
    var lastMsg = State.currentConv.messages[State.currentConv.messages.length - 1];
    if (lastMsg.role === 'assistant') {
      lastMsg.content = content;
      if (reasoning) lastMsg.reasoning = reasoning;
      State.updateConversation(State.currentConvId, { messages: State.currentConv.messages });
      
      // Re-render to remove streaming cursor
      renderMessages();
    }
  }

  async function sendMessage() {
    var textarea = document.getElementById('composer-textarea');
    var content = textarea ? textarea.value.trim() : '';
    
    if (!content) return;
    
    // Check streaming
    if (State.isStreaming) return;
    
    // Reset textarea
    if (textarea) {
      textarea.value = '';
      textarea.style.height = 'auto';
    }
    
    // Get uploaded image
    var uploadedImage = Chat.pendingImage || '';
    
    // Add user message
    addMessage('user', content, { image: uploadedImage });
    Chat.pendingImage = '';
    updateImagePreview();
    
    // Show assistant loading
    addMessage('assistant', '...');
    var loadingEl = document.querySelector('.message:last-child .msg-bubble');
    if (loadingEl) {
      loadingEl.innerHTML = '<div class="message-loading"><div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>';
    }
    
    // Prepare request
    var messages = buildMessages();
    var body = {
      model: State.currentModel,
      messages: messages,
      stream: true
    };
    
    if (State.deepThink) {
      body.reasoning_effort = 'high';
    }
    if (State.webSearch) {
      body.web_search = true;
    }
    
    State.isStreaming = true;
    currentAbortController = new AbortController();
    
    var fullContent = '';
    var reasoningContent = '';
    
    try {
      // Check if we should use mock mode (no backend)
      var useMock = false;
      try {
        // Try a quick fetch to see if API is available
        var testRes = await fetch('/api/health', { method: 'HEAD', signal: AbortSignal.timeout(2000) });
        if (!testRes.ok) useMock = true;
      } catch(e) {
        useMock = true;
      }
      
      if (useMock) {
        // Mock streaming response for demo
        var mockResponse = generateMockResponse(content);
        var words = mockResponse.split('');
        var i = 0;
        var interval = setInterval(function() {
          if (i < words.length) {
            fullContent += words[i];
            updateLastMessage(fullContent, reasoningContent);
            i++;
          } else {
            clearInterval(interval);
            finalizeLastMessage(fullContent, reasoningContent);
            State.isStreaming = false;
            currentAbortController = null;
            scrollToBottom();
          }
        }, 20);
      } else {
        // Real API
        body.signal = currentAbortController.signal;
        
        await API.streamChat(body,
          function(chunk) {
            if (chunk.choices && chunk.choices.length > 0) {
              var delta = chunk.choices[0].delta;
              if (delta.content) {
                fullContent += delta.content;
              }
              if (delta.reasoning_content) {
                reasoningContent += delta.reasoning_content;
              }
              updateLastMessage(fullContent, reasoningContent);
              scrollToBottom();
            }
          },
          function() {
            finalizeLastMessage(fullContent, reasoningContent);
            State.isStreaming = false;
            currentAbortController = null;
            scrollToBottom();
            
            // Generate title if needed
            if (State.currentConv && (!State.currentConv.title || State.currentConv.title === '新对话')) {
              generateTitle(content);
            }
          },
          function(err) {
            State.isStreaming = false;
            currentAbortController = null;
            // Update the loading message with error
            var lastMsg = State.currentConv.messages[State.currentConv.messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.content = '抱歉，发生了错误: ' + err.message;
              State.updateConversation(State.currentConvId, { messages: State.currentConv.messages });
              renderMessages();
            }
            UI.showToast(err.message, 'error');
          }
        );
      }
    } catch (err) {
      State.isStreaming = false;
      currentAbortController = null;
      var errorMsg = err.name === 'AbortError' ? '已取消' : '请求失败: ' + err.message;
      var lastMsg2 = State.currentConv.messages[State.currentConv.messages.length - 1];
      if (lastMsg2 && lastMsg2.role === 'assistant') {
        lastMsg2.content = errorMsg;
        State.updateConversation(State.currentConvId, { messages: State.currentConv.messages });
        renderMessages();
      }
    }
  }

  function cancelStream() {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
  }

  function buildMessages() {
    var msgs = [];
    
    // Add system prompt for agent
    var agent = State.agents.find(function(a) { return a.id === State.currentAgent; });
    if (agent && agent.id !== 'default') {
      msgs.push({ role: 'system', content: getAgentPrompt(agent) });
    }
    
    if (State.webSearch) {
      msgs.push({ role: 'system', content: '你将使用联网搜索功能获取最新信息。当需要实时信息时，请主动搜索并提供来源。' });
    }
    
    // Add conversation history
    if (State.currentConv && State.currentConv.messages) {
      State.currentConv.messages.forEach(function(m) {
        if (m.role !== 'system') {
          msgs.push({ role: m.role, content: m.content });
        }
      });
    }
    
    return msgs;
  }

  function getAgentPrompt(agent) {
    var prompts = {
      'writer': '你是一个专业的写作助手。你擅长创作各种类型的文章、文案、故事和创意写作。请提供高质量的写作建议和内容。',
      'coder': '你是一个专业的编程助手。你擅长编写、调试和优化代码。请提供清晰的代码示例和解释。',
      'translator': '你是一个专业翻译助手。你擅长多语言翻译，保持原文意思的同时让译文自然流畅。'
    };
    return prompts[agent.id] || '你是一个有用的AI助手。';
  }

  async function newConversation() {
    if (State.isStreaming) {
      cancelStream();
      await new Promise(function(r) { setTimeout(r, 100); });
    }
    
    State.currentConvId = null;
    State.currentConv = null;
    renderWelcome();
    
    // Focus composer
    var composer = document.getElementById('composer-textarea');
    if (composer) composer.focus();
  }

  async function switchConversation(id) {
    if (State.isStreaming) {
      cancelStream();
      await new Promise(function(r) { setTimeout(r, 100); });
    }
    
    await State.switchConv(id);
    if (State.currentConv && State.currentConv.messages && State.currentConv.messages.length > 0) {
      renderMessages();
    } else {
      renderWelcome();
    }
    renderConversations();
    UI.closeMobileSidebar();
  }

  async function deleteConversation(id) {
    if (State.isStreaming) return;
    
    if (!confirm('确定删除此对话？')) return;
    
    if (State.token) {
      try {
        await API.del('/conversations/' + id);
      } catch(e) {}
    }
    
    State.removeConversation(id);
    if (State.currentConvId === id) {
      renderWelcome();
    }
    renderConversations();
  }

  function generateTitle(text) {
    var title = text.substring(0, 30);
    if (text.length > 30) title += '...';
    
    if (State.currentConv) {
      State.currentConv.title = title;
      State.updateConversation(State.currentConvId, { title: title });
      renderConversations();
    }
  }

  function toggleDeepThink() {
    State.deepThink = !State.deepThink;
    var btn = document.querySelector('[data-action="deep-think"]');
    if (btn) btn.classList.toggle('active', State.deepThink);
  }

  function toggleWebSearch() {
    State.webSearch = !State.webSearch;
    var btn = document.querySelector('[data-action="web-search"]');
    if (btn) btn.classList.toggle('active', State.webSearch);
  }

  function togglePlusMenu() {
    var menu = document.getElementById('plus-menu');
    if (menu) menu.classList.toggle('show');
  }

  function handleFileUpload() {
    var input = document.getElementById('file-upload-input');
    if (!input) {
      input = document.createElement('input');
      input.id = 'file-upload-input';
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (file) {
          var reader = new FileReader();
          reader.onload = function(ev) {
            Chat.pendingImage = ev.target.result;
            updateImagePreview();
          };
          reader.readAsDataURL(file);
        }
      });
    }
    input.click();
    document.getElementById('plus-menu')?.classList.remove('show');
  }

  function updateImagePreview() {
    var bar = document.getElementById('image-preview-bar');
    if (!bar) return;
    
    if (Chat.pendingImage) {
      bar.classList.add('show');
      bar.innerHTML = '<div class="image-preview-item"><img src="' + Chat.pendingImage + '"><button class="remove-img" onclick="Chat.pendingImage=\'\';Chat.updateImagePreview()">✕</button></div>';
    } else {
      bar.classList.remove('show');
      bar.innerHTML = '';
    }
  }

  function selectModel(modelId) {
    State.currentModel = modelId;
    var btn = document.getElementById('model-picker-btn');
    if (btn) {
      var model = State.models.find(function(m) { return m.id === modelId; });
      if (model) {
        btn.innerHTML = model.name + ' <span style="font-size:10px">▼</span>';
      }
    }
    document.getElementById('model-dropdown')?.classList.remove('show');
  }

  function toggleModelDropdown() {
    var dd = document.getElementById('model-dropdown');
    if (dd) dd.classList.toggle('show');
  }

  function selectAgent(agentId) {
    State.currentAgent = agentId;
    var btn = document.getElementById('agent-picker-btn');
    if (btn) {
      var agent = State.agents.find(function(a) { return a.id === agentId; });
      if (agent) {
        btn.innerHTML = agent.name + ' <span style="font-size:10px">▼</span>';
      }
    }
    document.getElementById('agent-dropdown')?.classList.remove('show');
  }

  function toggleAgentDropdown() {
    var dd = document.getElementById('agent-dropdown');
    if (dd) dd.classList.toggle('show');
  }

  function scrollToBottom() {
    var area = document.getElementById('message-area');
    if (area) {
      setTimeout(function() {
        area.scrollTop = area.scrollHeight;
      }, 50);
    }
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  function generateMockResponse(userMessage) {
    var lower = userMessage.toLowerCase();
    if (lower.includes('你好') || lower.includes('hello') || lower.includes('hi')) {
      return '你好！我是AI智能助手，很高兴为你服务！我可以帮助你写代码、翻译、总结文章、回答问题等。请问有什么我可以帮你的吗？';
    } else if (lower.includes('翻译')) {
      return '好的，我来帮你翻译。\n\n原文：' + userMessage.replace('翻译', '').trim() + '\n\n翻译结果：\n\n> Hello! This is a translation example. Please provide the text you would like me to translate, and I will help you with the translation.';
    } else if (lower.includes('代码') || lower.includes('code') || lower.includes('写')) {
      return '好的，我来帮你编写代码。以下是一个示例：\n\n```python\ndef hello_world():\n    """打印问候语"""\n    print("Hello, World!")\n    \n# 主程序\nif __name__ == "__main__":\n    hello_world()\n```\n\n这是一个简单的Python程序。如果你有具体的编程需求，请告诉我更多细节！';
    } else if (lower.includes('总结')) {
      return '好的，我来帮你总结。\n\n**核心要点：**\n\n1. 这是你提供的内容总结\n2. 主要观点已经被提取\n3. 关键信息已整理\n\n如果你有具体的文章或内容需要总结，请粘贴给我！';
    } else {
      return '好的，我来回答你的问题。\n\n' + userMessage + '\n\n这是一个模拟回复，因为当前未连接到后端API。当你部署到服务器并配置好API端点后，这里将会显示AI模型的实际回复。\n\n**当前配置信息：**\n- 模型：' + State.currentModel + '\n- 深度思考：' + (State.deepThink ? '已开启' : '已关闭') + '\n- 联网搜索：' + (State.webSearch ? '已开启' : '已关闭') + '\n\n请继续提问！';
    }
  }

  // Public API
  return {
    init: init,
    sendMessage: sendMessage,
    cancelStream: cancelStream,
    newConversation: newConversation,
    switchConversation: switchConversation,
    deleteConversation: deleteConversation,
    renderConversations: renderConversations,
    renderMessages: renderMessages,
    renderWelcome: renderWelcome,
    sendSuggestion: sendSuggestion,
    toggleDeepThink: toggleDeepThink,
    toggleWebSearch: toggleWebSearch,
    togglePlusMenu: togglePlusMenu,
    handleFileUpload: handleFileUpload,
    updateImagePreview: updateImagePreview,
    selectModel: selectModel,
    toggleModelDropdown: toggleModelDropdown,
    selectAgent: selectAgent,
    toggleAgentDropdown: toggleAgentDropdown,
    pendingImage: '',
    scrollToBottom: scrollToBottom
  };
})();

// Initialize chat on page load (delayed to wait for common.js)
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to let common.js initialize
  setTimeout(function() {
    if (document.getElementById('chat-view')) {
      Chat.init();
    }
  }, 50);
});
