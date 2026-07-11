/* ============================================================
   common.js - Shared Utilities (API, Auth, Router, State, UI)
   ============================================================ */

var API = (function() {
  'use strict';

  var base = '/api';

  async function request(path, opts) {
    opts = opts || {};
    var url = base + path;
    var headers = opts.headers || {};
    
    // Default content-type for POST/PUT
    if (opts.body && !headers['Content-Type'] && typeof opts.body === 'object') {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    
    // Auth token
    var token = State && State.token ? State.token : localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    
    try {
      var res = await fetch(url, {
        method: opts.method || 'GET',
        headers: headers,
        body: opts.body,
        signal: opts.signal
      });
      
      if (res.status === 401) {
        // Token expired or invalid
        State.token = null;
        localStorage.removeItem('token');
        State.user = null;
        if (typeof Auth !== 'undefined' && Auth.showLogin) {
          Auth.showLogin();
        }
        throw new Error('璇峰厛鐧诲綍');
      }
      
      if (res.status === 204) {
        return null;
      }
      
      var data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || '璇锋眰澶辫触');
      }
      
      return data;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (err.message === '璇峰厛鐧诲綍') throw err;
      throw new Error(err.message || '缃戠粶閿欒');
    }
  }

  async function get(path) {
    return request(path, { method: 'GET' });
  }

  async function post(path, data) {
    return request(path, { method: 'POST', body: data });
  }

  async function del(path) {
    return request(path, { method: 'DELETE' });
  }

  async function streamChat(body, onChunk, onDone, onError) {
    var token = State && State.token ? State.token : localStorage.getItem('token');
    var url = base + '/chat';
    
    try {
      var res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? 'Bearer ' + token : ''
        },
        body: JSON.stringify(body)
      });
      
      if (res.status === 401) {
        State.token = null;
        localStorage.removeItem('token');
        State.user = null;
        if (typeof Auth !== 'undefined' && Auth.showLogin) {
          Auth.showLogin();
        }
        if (onError) onError(new Error('璇峰厛鐧诲綍'));
        return;
      }
      
      if (!res.ok) {
        var errData;
        try { errData = await res.json(); } catch(e) {}
        if (onError) onError(new Error((errData && errData.error) || '璇锋眰澶辫触'));
        return;
      }
      
      // Check content type for SSE
      var contentType = res.headers.get('Content-Type') || '';
      
      if (contentType.indexOf('text/event-stream') !== -1 || contentType.indexOf('text/plain') !== -1) {
        // Read as text and parse SSE manually
        var text = await res.text();
        var lines = text.split('\n');
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (line.indexOf('data:') === 0) {
            var dataStr = line.substring(5).trim();
            if (dataStr === '[DONE]') {
              if (onDone) onDone();
              return;
            }
            try {
              var parsed = JSON.parse(dataStr);
              if (onChunk) onChunk(parsed);
            } catch(e) {
              // Skip malformed chunks
            }
          }
        }
        if (onDone) onDone();
      } else {
        // Handle as regular JSON
        var result = await res.json();
        if (onChunk) {
          onChunk({ choices: [{ delta: { content: result.content || result.text || JSON.stringify(result) } }] });
        }
        if (onDone) onDone();
      }
    } catch (err) {
      if (onError) onError(err);
    }
  }

  return {
    base: base,
    request: request,
    get: get,
    post: post,
    del: del,
    streamChat: streamChat
  };
})();

/* ============================================================
   State Module
   ============================================================ */
var State = (function() {
  'use strict';

  var state = {
    user: null,
    token: localStorage.getItem('token'),
    conversations: [],
    currentConv: null,
    currentConvId: null,
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', badge: '鐑棬' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', badge: '缁忔祹' },
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', badge: '' },
      { id: 'deepseek-v3', name: 'DeepSeek V3', badge: '鍏嶈垂' }
    ],
    agents: [
      { id: 'default', name: '榛樿鍔╂墜', desc: '閫氱敤瀵硅瘽鍔╂墜', avatar: '馃' },
      { id: 'writer', name: '鍐欎綔鍔╂墜', desc: '鏂囩珷銆佹枃妗堛€佸垱鎰忓啓浣?, avatar: '鉁嶏笍' },
      { id: 'coder', name: '缂栫▼鍔╂墜', desc: '浠ｇ爜缂栧啓涓庤皟璇?, avatar: '馃捇' },
      { id: 'translator', name: '缈昏瘧鍔╂墜', desc: '澶氳瑷€缈昏瘧', avatar: '馃寪' }
    ],
    currentModel: 'gpt-4o-mini',
    currentAgent: 'default',
    deepThink: false,
    webSearch: false,
    isStreaming: false,
    studioHistory: [],
    pricing: {
      plan: 'free',
      tokens: 0,
      checkedIn: false,
      transactions: []
    }
  };

  function loadFromStorage() {
    try {
      var saved = localStorage.getItem('ai_state');
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed.studioHistory) state.studioHistory = parsed.studioHistory;
        if (parsed.pricing) state.pricing = parsed.pricing;
        if (parsed.currentModel) state.currentModel = parsed.currentModel;
        if (parsed.currentAgent) state.currentAgent = parsed.currentAgent;
        if (parsed.conversations) state.conversations = parsed.conversations;
      }
    } catch(e) {}
  }

  function saveToStorage() {
    try {
      localStorage.setItem('ai_state', JSON.stringify({
        studioHistory: state.studioHistory,
        pricing: state.pricing,
        currentModel: state.currentModel,
        currentAgent: state.currentAgent,
        conversations: state.conversations.map(function(c) {
          return { id: c.id, title: c.title, messages: c.messages, model: c.model, agent: c.agent, createdAt: c.createdAt };
        })
      }));
    } catch(e) {}
  }

  loadFromStorage();

  async function loadUser() {
    if (!state.token) return null;
    try {
      var data = await API.get('/auth/me');
      state.user = data.user || data;
      return state.user;
    } catch(e) {
      return null;
    }
  }

  async function loadModels() {
    try {
      var data = await API.get('/models');
      if (data.models) state.models = data.models;
      return state.models;
    } catch(e) {
      return state.models;
    }
  }

  async function loadConversations() {
    if (!state.token) return [];
    try {
      var data = await API.get('/conversations');
      state.conversations = data.conversations || data || [];
      return state.conversations;
    } catch(e) {
      return [];
    }
  }

  async function switchConv(id) {
    state.currentConvId = id;
    if (id) {
      try {
        var data = await API.get('/conversations/' + id);
        state.currentConv = data.conversation || data;
      } catch(e) {
        state.currentConv = state.conversations.find(function(c) { return c.id === id; }) || null;
      }
    } else {
      state.currentConv = null;
    }
    return state.currentConv;
  }

  function getConvById(id) {
    return state.conversations.find(function(c) { return c.id === id; }) || null;
  }

  function addConversation(conv) {
    state.conversations.unshift(conv);
    state.currentConvId = conv.id;
    state.currentConv = conv;
    saveToStorage();
  }

  function removeConversation(id) {
    state.conversations = state.conversations.filter(function(c) { return c.id !== id; });
    if (state.currentConvId === id) {
      state.currentConvId = null;
      state.currentConv = null;
    }
    saveToStorage();
  }

  function updateConversation(id, updates) {
    var conv = state.conversations.find(function(c) { return c.id === id; });
    if (conv) {
      Object.assign(conv, updates);
      if (state.currentConvId === id) {
        state.currentConv = conv;
      }
      saveToStorage();
    }
  }

  function addStudioImage(img) {
    state.studioHistory.unshift(img);
    saveToStorage();
  }

  function updatePricing(updates) {
    Object.assign(state.pricing, updates);
    saveToStorage();
  }

  return {
    get user() { return state.user; },
    set user(v) { state.user = v; },
    get token() { return state.token; },
    set token(v) { state.token = v; },
    get conversations() { return state.conversations; },
    set conversations(v) { state.conversations = v; },
    get currentConv() { return state.currentConv; },
    set currentConv(v) { state.currentConv = v; },
    get currentConvId() { return state.currentConvId; },
    set currentConvId(v) { state.currentConvId = v; },
    get models() { return state.models; },
    get agents() { return state.agents; },
    get currentModel() { return state.currentModel; },
    set currentModel(v) { state.currentModel = v; saveToStorage(); },
    get currentAgent() { return state.currentAgent; },
    set currentAgent(v) { state.currentAgent = v; saveToStorage(); },
    get deepThink() { return state.deepThink; },
    set deepThink(v) { state.deepThink = v; },
    get webSearch() { return state.webSearch; },
    set webSearch(v) { state.webSearch = v; },
    get isStreaming() { return state.isStreaming; },
    set isStreaming(v) { state.isStreaming = v; },
    get studioHistory() { return state.studioHistory; },
    get pricing() { return state.pricing; },
    loadUser: loadUser,
    loadModels: loadModels,
    loadConversations: loadConversations,
    switchConv: switchConv,
    getConvById: getConvById,
    addConversation: addConversation,
    removeConversation: removeConversation,
    updateConversation: updateConversation,
    addStudioImage: addStudioImage,
    updatePricing: updatePricing,
    saveToStorage: saveToStorage
  };
})();

/* ============================================================
   Auth Module
   ============================================================ */
var Auth = (function() {
  'use strict';

  async function login(email, password) {
    var data = await API.post('/auth/login', { email: email, password: password });
    if (data.token) {
      State.token = data.token;
      localStorage.setItem('token', data.token);
      State.user = data.user || data;
      UI.hideModal();
      UI.showToast('鐧诲綍鎴愬姛', 'success');
      App.refreshUI();
      return data;
    }
    throw new Error('鐧诲綍澶辫触');
  }

  async function register(email, password, name) {
    var data = await API.post('/auth/register', {
      email: email,
      password: password,
      name: name
    });
    if (data.token) {
      State.token = data.token;
      localStorage.setItem('token', data.token);
      State.user = data.user || data;
      UI.hideModal();
      UI.showToast('娉ㄥ唽鎴愬姛', 'success');
      App.refreshUI();
      return data;
    }
    throw new Error('娉ㄥ唽澶辫触');
  }

  async function logout() {
    try {
      await API.post('/auth/logout');
    } catch(e) {}
    State.token = null;
    localStorage.removeItem('token');
    State.user = null;
    State.conversations = [];
    State.currentConv = null;
    State.currentConvId = null;
    UI.showToast('宸查€€鍑虹櫥褰?, 'info');
    App.refreshUI();
  }

  function showLogin() {
    var html = '';
    html += '<div class="modal-card">';
    html += '  <div class="modal-header">';
    html += '    <h2>娆㈣繋鍥炴潵</h2>';
    html += '    <button class="modal-close" onclick="UI.hideModal()">鉁?/button>';
    html += '  </div>';
    html += '  <div class="modal-body">';
    html += '    <div class="auth-tabs">';
    html += '      <button class="auth-tab active" onclick="Auth.showLogin()">鐧诲綍</button>';
    html += '      <button class="auth-tab" onclick="Auth.showRegister()">娉ㄥ唽</button>';
    html += '    </div>';
    html += '    <div class="social-login">';
    html += '      <button class="social-btn"><span class="social-label">寰俊</span></button>';
    html += '      <button class="social-btn"><span class="social-label">GitHub</span></button>';
    html += '    </div>';
    html += '    <div class="divider">鎴栦娇鐢ㄩ偖绠?/div>';
    html += '    <div class="form-group">';
    html += '      <label>閭</label>';
    html += '      <input class="form-input" type="email" id="login-email" placeholder="璇疯緭鍏ラ偖绠? autocomplete="email">';
    html += '      <div class="form-error" id="login-email-error">璇疯緭鍏ユ湁鏁堥偖绠?/div>';
    html += '    </div>';
    html += '    <div class="form-group">';
    html += '      <label>瀵嗙爜</label>';
    html += '      <input class="form-input" type="password" id="login-password" placeholder="璇疯緭鍏ュ瘑鐮? autocomplete="current-password">';
    html += '      <div class="form-error" id="login-password-error">璇疯緭鍏ュ瘑鐮?/div>';
    html += '    </div>';
    html += '    <button class="btn btn-primary btn-block" onclick="Auth.handleLogin()">鐧诲綍</button>';
    html += '  </div>';
    html += '</div>';
    UI.showModal(html);
    
    setTimeout(function() {
      var emailInput = document.getElementById('login-email');
      var passwordInput = document.getElementById('login-password');
      if (emailInput) {
        emailInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') Auth.handleLogin();
        });
      }
      if (passwordInput) {
        passwordInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') Auth.handleLogin();
        });
      }
    }, 50);
  }

  function showRegister() {
    var html = '';
    html += '<div class="modal-card">';
    html += '  <div class="modal-header">';
    html += '    <h2>鍒涘缓璐﹀彿</h2>';
    html += '    <button class="modal-close" onclick="UI.hideModal()">鉁?/button>';
    html += '  </div>';
    html += '  <div class="modal-body">';
    html += '    <div class="auth-tabs">';
    html += '      <button class="auth-tab" onclick="Auth.showLogin()">鐧诲綍</button>';
    html += '      <button class="auth-tab active" onclick="Auth.showRegister()">娉ㄥ唽</button>';
    html += '    </div>';
    html += '    <div class="social-login">';
    html += '      <button class="social-btn"><span class="social-label">寰俊</span></button>';
    html += '      <button class="social-btn"><span class="social-label">GitHub</span></button>';
    html += '    </div>';
    html += '    <div class="divider">鎴栦娇鐢ㄩ偖绠?/div>';
    html += '    <div class="form-group">';
    html += '      <label>鏄电О</label>';
    html += '      <input class="form-input" type="text" id="reg-name" placeholder="璇疯緭鍏ユ樀绉?>';
    html += '      <div class="form-error" id="reg-name-error">璇疯緭鍏ユ樀绉?/div>';
    html += '    </div>';
    html += '    <div class="form-group">';
    html += '      <label>閭</label>';
    html += '      <input class="form-input" type="email" id="reg-email" placeholder="璇疯緭鍏ラ偖绠? autocomplete="email">';
    html += '      <div class="form-error" id="reg-email-error">璇疯緭鍏ユ湁鏁堥偖绠?/div>';
    html += '    </div>';
    html += '    <div class="form-group">';
    html += '      <label>瀵嗙爜</label>';
    html += '      <input class="form-input" type="password" id="reg-password" placeholder="璇疯缃瘑鐮侊紙鑷冲皯6浣嶏級" autocomplete="new-password">';
    html += '      <div class="form-error" id="reg-password-error">瀵嗙爜鑷冲皯6浣?/div>';
    html += '    </div>';
    html += '    <div class="form-checkbox">';
    html += '      <input type="checkbox" id="reg-agree">';
    html += '      <label for="reg-agree">鎴戝凡闃呰骞跺悓鎰?<a href="#">鏈嶅姟鏉℃</a> 鍜?<a href="#">闅愮鏀跨瓥</a></label>';
    html += '    </div>';
    html += '    <button class="btn btn-primary btn-block" onclick="Auth.handleRegister()">娉ㄥ唽</button>';
    html += '  </div>';
    html += '</div>';
    UI.showModal(html);

    setTimeout(function() {
      var inputs = ['reg-name', 'reg-email', 'reg-password'];
      inputs.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
          el.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') Auth.handleRegister();
          });
        }
      });
    }, 50);
  }

  async function handleLogin() {
    var email = document.getElementById('login-email');
    var password = document.getElementById('login-password');
    var emailErr = document.getElementById('login-email-error');
    var passwordErr = document.getElementById('login-password-error');
    
    var valid = true;
    
    if (!email || !email.value.trim() || !email.value.includes('@')) {
      if (email) email.classList.add('error');
      if (emailErr) emailErr.classList.add('show');
      valid = false;
    } else {
      if (email) email.classList.remove('error');
      if (emailErr) emailErr.classList.remove('show');
    }
    
    if (!password || !password.value) {
      if (password) password.classList.add('error');
      if (passwordErr) passwordErr.classList.add('show');
      valid = false;
    } else {
      if (password) password.classList.remove('error');
      if (passwordErr) passwordErr.classList.remove('show');
    }
    
    if (!valid) return;
    
    UI.showLoading(document.querySelector('.btn-primary'));
    try {
      await login(email.value.trim(), password.value);
    } catch (e) {
      UI.showToast(e.message, 'error');
    }
    UI.hideLoading(document.querySelector('.btn-primary'));
  }

  async function handleRegister() {
    var name = document.getElementById('reg-name');
    var email = document.getElementById('reg-email');
    var password = document.getElementById('reg-password');
    var agree = document.getElementById('reg-agree');
    var nameErr = document.getElementById('reg-name-error');
    var emailErr = document.getElementById('reg-email-error');
    var passwordErr = document.getElementById('reg-password-error');
    
    var valid = true;
    
    if (!name || !name.value.trim()) {
      if (name) name.classList.add('error');
      if (nameErr) nameErr.classList.add('show');
      valid = false;
    } else {
      if (name) name.classList.remove('error');
      if (nameErr) nameErr.classList.remove('show');
    }
    
    if (!email || !email.value.trim() || !email.value.includes('@')) {
      if (email) email.classList.add('error');
      if (emailErr) emailErr.classList.add('show');
      valid = false;
    } else {
      if (email) email.classList.remove('error');
      if (emailErr) emailErr.classList.remove('show');
    }
    
    if (!password || !password.value || password.value.length < 6) {
      if (password) password.classList.add('error');
      if (passwordErr) passwordErr.classList.add('show');
      valid = false;
    } else {
      if (password) password.classList.remove('error');
      if (passwordErr) passwordErr.classList.remove('show');
    }
    
    if (!agree || !agree.checked) {
      UI.showToast('璇峰悓鎰忔湇鍔℃潯娆?, 'warning');
      return;
    }
    
    if (!valid) return;
    
    UI.showLoading(document.querySelector('.btn-primary'));
    try {
      await register(email.value.trim(), password.value, name.value.trim());
    } catch (e) {
      UI.showToast(e.message, 'error');
    }
    UI.hideLoading(document.querySelector('.btn-primary'));
  }

  return {
    login: login,
    register: register,
    logout: logout,
    showLogin: showLogin,
    showRegister: showRegister,
    handleLogin: handleLogin,
    handleRegister: handleRegister
  };
})();

/* ============================================================
   UI Module
   ============================================================ */
var UI = (function() {
  'use strict';

  function showModal(html) {
    var overlay = document.getElementById('modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = html;
    overlay.classList.add('show');
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) hideModal();
    });
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  function hideModal() {
    var overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  function showToast(msg, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    var icons = { success: '鉁?, error: '鉁?, info: '鈩?, warning: '鈿? };
    toast.innerHTML = '<span>' + (icons[type] || '') + '</span> ' + msg;
    container.appendChild(toast);
    
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }

  function showLoading(el) {
    if (!el) return;
    el.disabled = true;
    var originalText = el.innerHTML;
    el.dataset.originalText = originalText;
    el.innerHTML = '<span class="loading-spinner"></span>';
  }

  function hideLoading(el) {
    if (!el) return;
    el.disabled = false;
    if (el.dataset.originalText) {
      el.innerHTML = el.dataset.originalText;
      delete el.dataset.originalText;
    }
  }

  function updateBalance() {
    var balanceEls = document.querySelectorAll('.user-balance');
    if (State.user) {
      var balance = State.user.balance !== undefined ? State.user.balance : 0;
      balanceEls.forEach(function(el) {
        el.textContent = '浣欓: ' + balance + ' 绉垎';
      });
    } else {
      balanceEls.forEach(function(el) {
        el.textContent = '';
      });
    }
  }

  function toggleUserMenu() {
    var menu = document.getElementById('user-menu-dropdown');
    if (menu) {
      menu.classList.toggle('show');
    }
  }

  function closeUserMenu() {
    var menu = document.getElementById('user-menu-dropdown');
    if (menu) {
      menu.classList.remove('show');
    }
  }

  function toggleNotifications() {
    var panel = document.getElementById('notification-panel');
    if (panel) {
      panel.classList.toggle('show');
    }
  }

  function closeNotifications() {
    var panel = document.getElementById('notification-panel');
    if (panel) {
      panel.classList.remove('show');
    }
  }

  function toggleMobileSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var mask = document.getElementById('sidebar-mask');
    if (sidebar) {
      sidebar.classList.toggle('open');
      if (mask) mask.classList.toggle('show');
    }
  }

  function closeMobileSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var mask = document.getElementById('sidebar-mask');
    if (sidebar) {
      sidebar.classList.remove('open');
      if (mask) mask.classList.remove('show');
    }
  }

  // Close dropdowns on outside click
  document.addEventListener('click', function(e) {
    // User menu
    var menu = document.getElementById('user-menu-dropdown');
    if (menu && !e.target.closest('.sidebar-user') && !e.target.closest('#user-menu-dropdown')) {
      menu.classList.remove('show');
    }
    // Notification panel
    var notifPanel = document.getElementById('notification-panel');
    if (notifPanel && !e.target.closest('.notification-btn') && !e.target.closest('#notification-panel')) {
      notifPanel.classList.remove('show');
    }
    // Model dropdown
    var modelDropdown = document.getElementById('model-dropdown');
    if (modelDropdown && !e.target.closest('.model-picker')) {
      modelDropdown.classList.remove('show');
    }
    // Agent dropdown
    var agentDropdown = document.getElementById('agent-dropdown');
    if (agentDropdown && !e.target.closest('.agent-picker')) {
      agentDropdown.classList.remove('show');
    }
    // Plus menu
    var plusMenu = document.getElementById('plus-menu');
    if (plusMenu && !e.target.closest('.tool-btn') && !e.target.closest('#plus-menu')) {
      plusMenu.classList.remove('show');
    }
  });

  return {
    showModal: showModal,
    hideModal: hideModal,
    showToast: showToast,
    showLoading: showLoading,
    hideLoading: hideLoading,
    updateBalance: updateBalance,
    toggleUserMenu: toggleUserMenu,
    closeUserMenu: closeUserMenu,
    toggleNotifications: toggleNotifications,
    closeNotifications: closeNotifications,
    toggleMobileSidebar: toggleMobileSidebar,
    closeMobileSidebar: closeMobileSidebar
  };
})();

/* ============================================================
   Router Module
   ============================================================ */
var Router = (function() {
  'use strict';

  var currentView = 'chat';

  function switchView(view) {
    // Update rail buttons
    var railBtns = document.querySelectorAll('.rail-btn');
    railBtns.forEach(function(btn) {
      var v = btn.getAttribute('data-view');
      btn.classList.toggle('active', v === view);
    });

    // Update views
    var chatView = document.getElementById('chat-view');
    var studioView = document.getElementById('studio-view');
    var pricingView = document.getElementById('pricing-view');
    var sidebar = document.querySelector('.sidebar');

    if (chatView) chatView.classList.toggle('hidden', view !== 'chat');
    if (studioView) studioView.classList.toggle('active', view === 'studio');
    if (pricingView) pricingView.classList.toggle('active', view === 'pricing');

    // Show sidebar only for chat view on mobile
    if (sidebar) {
      sidebar.style.display = view === 'chat' ? '' : 'none';
    }

    currentView = view;

    // Trigger view-specific init
    if (view === 'studio' && typeof Studio !== 'undefined' && Studio.init) {
      Studio.init();
    }
    if (view === 'pricing' && typeof Pricing !== 'undefined' && Pricing.init) {
      Pricing.init();
    }
  }

  return {
    get currentView() { return currentView; },
    switchView: switchView
  };
})();

/* ============================================================
   App Initialization
   ============================================================ */
var App = (function() {
  'use strict';

  function refreshUI() {
    var sidebarUser = document.getElementById('sidebar-user-area');
    var sidebarGuest = document.getElementById('sidebar-guest-area');
    var topLoginBtn = document.getElementById('top-login-btn');
    var topUserArea = document.getElementById('top-user-area');
    var balanceEls = document.querySelectorAll('.user-balance');
    var nameEls = document.querySelectorAll('.user-name');
    var avatarText = document.querySelectorAll('.user-avatar-text');

    if (State.user && State.token) {
      // Logged in
      if (sidebarUser) sidebarUser.style.display = 'flex';
      if (sidebarGuest) sidebarGuest.style.display = 'none';
      if (topLoginBtn) topLoginBtn.style.display = 'none';
      if (topUserArea) topUserArea.style.display = '';

      var name = State.user.name || State.user.email || '鐢ㄦ埛';
      var initial = name.charAt(0).toUpperCase();

      nameEls.forEach(function(el) { el.textContent = name; });
      avatarText.forEach(function(el) { el.textContent = initial; });

      if (balanceEls.length) {
        var balance = State.user.balance !== undefined ? State.user.balance : 0;
        balanceEls.forEach(function(el) { el.textContent = '浣欓: ' + balance + ' 绉垎'; });
      }
    } else {
      // Guest
      if (sidebarUser) sidebarUser.style.display = 'none';
      if (sidebarGuest) sidebarGuest.style.display = 'flex';
      if (topLoginBtn) topLoginBtn.style.display = '';
      if (topUserArea) topUserArea.style.display = 'none';
    }

    // Update conversation list
    if (typeof Chat !== 'undefined' && Chat.renderConversations) {
      Chat.renderConversations();
    }
  }

  function init() {
    // Close sidebar on mask click
    var mask = document.getElementById('sidebar-mask');
    if (mask) {
      mask.addEventListener('click', function() {
        UI.closeMobileSidebar();
      });
    }

    // Close sidebar on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        UI.closeMobileSidebar();
        UI.hideModal();
        UI.closeNotifications();
        UI.closeUserMenu();
      }
    });

    // Auto-resize textarea
    var composer = document.getElementById('composer-textarea');
    if (composer) {
      composer.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
      });
    }

    // Load user if token exists
    if (State.token) {
      State.loadUser().then(function() {
        refreshUI();
        State.loadConversations();
      });
    } else {
      refreshUI();
    }

    // Set default model in picker
    var modelBtn = document.getElementById('model-picker-btn');
    if (modelBtn) {
      var currentModel = State.models.find(function(m) { return m.id === State.currentModel; });
      if (currentModel) {
        modelBtn.innerHTML = currentModel.name + ' <span style="font-size:10px">鈻?/span>';
      }
    }
  }

  return {
    refreshUI: refreshUI,
    init: init
  };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  App.init();
});

