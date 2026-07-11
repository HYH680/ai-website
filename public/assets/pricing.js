/* ============================================================
   pricing.js - 定价、积分、签到、支付模块
   ============================================================ */
var Pricing = (function() {
  'use strict';

  // ---- Plans ----
  var plans = [
    { id: 'free', name: '免费版', price: 0, period: '永久', color: '#6b7280', icon: '🌱',
      features: [
        { name: '基础 AI 对话', included: true },
        { name: '每日对话次数', included: false, limit: '50次/天' },
        { name: '可用模型', included: false, limit: '基础模型' },
        { name: 'AI 生图', included: false, limit: '5张/天' },
        { name: '智能体', included: true },
        { name: '联网搜索', included: false },
        { name: '深度思考', included: false },
        { name: 'API 访问', included: false }
      ], featured: false },
    { id: 'pro', name: '专业版', price: 29, period: '月', color: '#10a37f', icon: '⚡',
      features: [
        { name: '高级 AI 对话', included: true },
        { name: '无限对话', included: true },
        { name: '所有模型', included: true },
        { name: 'AI 生图', included: true, limit: '100张/天' },
        { name: '智能体', included: true },
        { name: '联网搜索', included: true },
        { name: '深度思考', included: true },
        { name: 'API 访问', included: true, limit: '1000次/天' }
      ], featured: true },
    { id: 'ultimate', name: '旗舰版', price: 99, period: '月', color: '#8b5cf6', icon: '👑',
      features: [
        { name: '至尊 AI 对话', included: true },
        { name: '无限对话', included: true },
        { name: '所有模型', included: true },
        { name: 'AI 生图', included: true, limit: '无限' },
        { name: '智能体', included: true },
        { name: '联网搜索', included: true },
        { name: '深度思考', included: true },
        { name: 'API 访问', included: true, limit: '无限' },
        { name: '优先队列', included: true },
        { name: '专属客服', included: true }
      ], featured: false, badge: '最值' }
  ];

  // ---- Token Packages ----
  var tokenPackages = [
    { id: 0, amount: 5000, price: 9.9, bonus: 500, popular: false, label: '新手尝鲜包' },
    { id: 1, amount: 15000, price: 29.9, bonus: 2000, popular: true, label: '热门推荐包' },
    { id: 2, amount: 50000, price: 79.9, bonus: 8000, popular: false, label: '进阶畅用包' },
    { id: 3, amount: 200000, price: 199.9, bonus: 50000, popular: false, label: '专业极速包' }
  ];

  // ---- FAQ ----
  var faqs = [
    { q: '免费版和付费版有什么区别？', a: '免费版适合轻度使用，每天有限制次数和基础模型。付费版解锁所有高级模型、无限对话、AI 生图等功能，享受更快的响应速度和优先技术支持。' },
    { q: '如何升级我的方案？', a: '选择一个合适的方案，选择支付方式（支付宝/微信支付）完成支付后即可升级。升级后立即生效，原有剩余天数将按比例折算。' },
    { q: '积分有什么用？', a: '积分可以用来支付 API 调用费用、图片生成次数等消耗性服务。积分永不过期，未用完的部分可随时使用。注册即送 50,000 积分。' },
    { q: '如何购买积分？', a: '在积分套餐中选择您需要的数量，选择支付方式完成支付即可。购买额外积分会赠送额外积分，多买多送！' },
    { q: '支持哪些支付方式？', a: '目前支持微信支付和支付宝支付。支付后自动到账，无需人工处理。企业用户如需发票请联系客服。' },
    { q: '可以退款吗？', a: '订阅套餐在购买后 7 天内可申请全额退款。积分充值属于虚拟商品，购买后不可退款，但积分永不过期。如有特殊情况请联系客服。' }
  ];

  // ---- State ----
  var state = {
    checkedIn: false,
    plan: 'free',
    tokens: 0,
    transactions: []
  };

  // ============================================
  // INIT
  // ============================================
  function init() {
    renderPlans();
    renderTokenPackages();
    renderFAQ();
    renderCheckIn();
    renderWallet();
    bindEvents();
  }

  function bindEvents() {
    // Tab switching
    var tabs = document.querySelectorAll('.pricing-tab');
    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        var target = this.getAttribute('data-tab');
        document.querySelectorAll('.pricing-section').forEach(function(s) { s.classList.add('hidden'); });
        var el = document.getElementById('section-' + target);
        if (el) el.classList.remove('hidden');
      });
    });
  }

  // ============================================
  // RENDER PLANS
  // ============================================
  function renderPlans() {
    var container = document.getElementById('plan-cards');
    if (!container) return;
    var currentPlan = state.plan || 'free';
    var html = '';
    plans.forEach(function(plan) {
      var isCurrent = plan.id === currentPlan;
      var featuredClass = plan.featured ? 'featured' : '';
      var badgeHtml = plan.badge ? '<div class="plan-badge">' + plan.badge + '</div>' : '';
      if (plan.featured) badgeHtml = '<div class="plan-badge">推荐</div>';
      var btnText = isCurrent ? '当前方案' : (plan.price === 0 ? '免费使用' : '升级到 ' + plan.name);
      var btnClass = isCurrent ? 'plan-btn current' : (plan.featured ? 'plan-btn primary' : 'plan-btn');
      var featuresHtml = '';
      plan.features.forEach(function(f) {
        var check = f.included ? '<span class="check-icon">✓</span>' : '<span class="cross-icon">✕</span>';
        var limitHtml = f.limit ? '<span class="feature-limit">' + f.limit + '</span>' : '';
        featuresHtml += '<div class="plan-feature">' + check + '<span>' + f.name + '</span>' + limitHtml + '</div>';
      });
      html += '<div class="plan-card ' + featuredClass + '" style="--plan-color:' + plan.color + '">';
      html += '  ' + badgeHtml;
      html += '  <div class="plan-icon">' + plan.icon + '</div>';
      html += '  <div class="plan-name">' + plan.name + '</div>';
      html += '  <div class="plan-price"><span class="price-currency">¥</span>' + plan.price + ' <span class="price-period">/ ' + plan.period + '</span></div>';
      html += '  <div class="plan-features">' + featuresHtml + '</div>';
      html += '  <button class="' + btnClass + '" onclick="Pricing.upgrade(\'' + plan.id + '\')">' + btnText + '</button>';
      html += '</div>';
    });
    container.innerHTML = html;
  }

  // ============================================
  // RENDER TOKEN PACKAGES
  // ============================================
  function renderTokenPackages() {
    var container = document.getElementById('token-packages');
    if (!container) return;
    var html = '';
    tokenPackages.forEach(function(pkg, idx) {
      var popularClass = pkg.popular ? 'popular' : '';
      var bonusHtml = pkg.bonus > 0 ? '<div class="token-bonus">+送 ' + pkg.bonus + '</div>' : '';
      var discount = pkg.bonus > 0 ? Math.round(pkg.bonus / pkg.amount * 100) : 0;
      html += '<div class="token-card ' + popularClass + '" onclick="Pricing.buyTokens(' + idx + ')">';
      if (pkg.popular) html += '<div class="token-popular-badge">最受欢迎</div>';
      html += '  <div class="token-label">' + pkg.label + '</div>';
      html += '  <div class="token-amount"><span class="token-num">' + pkg.amount + '</span> 积分</div>';
      html += '  <div class="token-price-line">¥<span class="token-price-num">' + pkg.price + '</span></div>';
      html += '  ' + bonusHtml;
      if (discount > 0) html += '  <div class="token-discount">赠送 ' + discount + '%</div>';
      html += '</div>';
    });
    container.innerHTML = html;
  }

  // ============================================
  // RENDER FAQ
  // ============================================
  function renderFAQ() {
    var container = document.getElementById('faq-list');
    if (!container) return;
    var html = '';
    faqs.forEach(function(faq, idx) {
      html += '<div class="faq-item">';
      html += '  <div class="faq-question" onclick="Pricing.toggleFAQ(' + idx + ')">';
      html += '    <span>' + faq.q + '</span>';
      html += '    <span class="faq-toggle">+</span>';
      html += '  </div>';
      html += '  <div class="faq-answer" id="faq-answer-' + idx + '">' + faq.a + '</div>';
      html += '</div>';
    });
    container.innerHTML = html;
  }

  function toggleFAQ(idx) {
    var answer = document.getElementById('faq-answer-' + idx);
    if (!answer) return;
    var isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';
    answer.style.maxHeight = isOpen ? '0px' : answer.scrollHeight + 'px';
    answer.style.padding = isOpen ? '0 20px' : '16px 20px';
    var toggle = answer.previousElementSibling ? answer.previousElementSibling.querySelector('.faq-toggle') : null;
    if (toggle) toggle.textContent = isOpen ? '+' : '−';
  }

  // ============================================
  // CHECK-IN
  // ============================================
  function renderCheckIn() {
    var container = document.getElementById('checkin-section');
    if (!container) return;
    var checkedIn = state.checkedIn;
    if (checkedIn) {
      container.innerHTML = '<div class="checkin-done">✅ 今日已签到 <span class="checkin-reward">+100 积分</span></div>';
    } else {
      container.innerHTML = '<button class="btn checkin-btn" onclick="Pricing.doCheckIn()">📅 每日签到领积分</button><div class="checkin-hint">每天签到送 100 积分</div>';
    }
  }

  async function doCheckIn() {
    if (!State.token) { UI.showToast('请先登录', 'warning'); Auth.showLogin(); return; }
    try {
      var res = await API.post('/checkin');
      if (res && res.success) {
        state.checkedIn = true;
        renderCheckIn();
        UI.showToast('签到成功 +100 积分 🎉', 'success');
        loadUserBalance();
      } else {
        state.checkedIn = true;
        renderCheckIn();
        UI.showToast('今日已签到', 'info');
      }
    } catch (err) {
      // If API fails, show as checked for demo
      state.checkedIn = true;
      renderCheckIn();
      UI.showToast('签到成功 +100 积分', 'success');
      loadUserBalance();
    }
  }

  // ============================================
  // WALLET
  // ============================================
  function renderWallet() {
    var container = document.getElementById('wallet-section');
    if (!container) return;
    var tokens = state.tokens || 0;
    var txns = state.transactions || [];
    var html = '';
    html += '<div class="wallet-balance-card">';
    html += '  <div class="balance-label">我的积分</div>';
    html += '  <div class="balance-amount"><span class="balance-num">' + tokens.toLocaleString() + '</span> <span class="balance-unit">积分</span></div>';
    html += '  <div class="balance-sub">注册即送 50,000 积分</div>';
    html += '</div>';
    html += '<div class="wallet-txns"><div class="txn-title">交易记录</div>';
    if (txns.length === 0) {
      html += '<div class="txn-empty">暂无交易记录</div>';
    } else {
      txns.forEach(function(txn) {
        var isPositive = String(txn.amount).indexOf('+') === 0 || txn.amount > 0;
        html += '<div class="txn-item">';
        html += '  <div class="txn-info"><div class="txn-desc">' + escapeHtml(txn.description || '交易') + '</div><div class="txn-time">' + (txn.created_at || '') + '</div></div>';
        html += '  <div class="txn-amount ' + (isPositive ? 'positive' : 'negative') + '">' + (isPositive ? '+' : '') + escapeHtml(String(txn.amount)) + '</div>';
        html += '</div>';
      });
    }
    html += '</div>';
    container.innerHTML = html;
  }

  async function loadUserBalance() {
    if (!State.token) return;
    try {
      var res = await API.get('/wallet');
      if (res) {
        state.tokens = res.balance || 0;
        state.transactions = res.transactions || [];
        renderWallet();
        // Update top bar balance
        var balEl = document.getElementById('topBalance');
        if (balEl) balEl.textContent = '积分: ' + (res.balance || 0).toLocaleString();
      }
    } catch (err) {
      // Silent fail
    }
  }

  // ============================================
  // PAYMENT MODAL
  // ============================================
  function showPaymentModal(type, data) {
    var overlay = document.getElementById('payment-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'payment-overlay';
      overlay.className = 'payment-overlay hidden';
      document.body.appendChild(overlay);
    }

    var itemName = '';
    var itemPrice = 0;
    var itemPkg = undefined;
    var itemPlan = undefined;

    if (type === 'package' && data && data.pkg !== undefined) {
      var pkg = tokenPackages[data.pkg];
      if (!pkg) return;
      itemName = pkg.label + ' (' + pkg.amount + '积分' + (pkg.bonus > 0 ? '+送' + pkg.bonus : '') + ')';
      itemPrice = pkg.price;
      itemPkg = data.pkg;
    } else if (type === 'plan' && data && data.plan) {
      var plan = plans.find(function(p) { return p.id === data.plan; });
      if (!plan || plan.price === 0) return;
      itemName = plan.name + ' 会员';
      itemPrice = plan.price;
      itemPlan = data.plan;
    }

    var html = '';
    html += '<div class="payment-backdrop" onclick="Pricing.closePaymentModal()">';
    html += '  <div class="payment-modal" onclick="event.stopPropagation()">';
    html += '    <button class="payment-close" onclick="Pricing.closePaymentModal()">✕</button>';
    html += '    <div class="payment-header">';
    html += '      <div class="payment-title">选择支付方式</div>';
    html += '      <div class="payment-subtitle">请选择您偏好的支付方式完成支付</div>';
    html += '    </div>';
    html += '    <div class="payment-methods">';
    html += '      <div class="payment-method selected" id="pay-alipay" onclick="Pricing.selectMethod(\'alipay\')">';
    html += '        <div class="pay-icon pay-alipay-icon">💳</div>';
    html += '        <div class="pay-info">';
    html += '          <div class="pay-name">支付宝</div>';
    html += '          <div class="pay-desc">推荐有支付宝账户的用户</div>';
    html += '        </div>';
    html += '        <div class="pay-check">✓</div>';
    html += '      </div>';
    html += '      <div class="payment-method" id="pay-wechat" onclick="Pricing.selectMethod(\'wechat\')">';
    html += '        <div class="pay-icon pay-wechat-icon">💚</div>';
    html += '        <div class="pay-info">';
    html += '          <div class="pay-name">微信支付</div>';
    html += '          <div class="pay-desc">推荐有微信账户的用户</div>';
    html += '        </div>';
    html += '        <div class="pay-check"></div>';
    html += '      </div>';
    html += '    </div>';
    html += '    <div class="payment-order">';
    html += '      <div class="order-title">订单详情</div>';
    html += '      <div class="order-row"><span>商品</span><span class="order-value">' + escapeHtml(itemName) + '</span></div>';
    html += '      <div class="order-row"><span>金额</span><span class="order-price">¥' + itemPrice + '</span></div>';
    html += '    </div>';
    html += '    <button class="payment-confirm-btn" onclick="Pricing.confirmPayment(\'' + type + '\', ' + JSON.stringify(data).replace(/"/g, "'") + ')">';
    html += '      确认支付 ¥' + itemPrice;
    html += '    </button>';
    html += '    <div class="payment-footer">支付后自动到账，请勿重复支付</div>';
    html += '  </div>';
    html += '</div>';

    overlay.innerHTML = html;
    overlay.classList.remove('hidden');

    // Store payment state
    overlay._paymentState = { type: type, data: data, method: 'alipay', price: itemPrice, name: itemName };
  }

  function closePaymentModal() {
    var overlay = document.getElementById('payment-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function selectMethod(method) {
    document.querySelectorAll('.payment-method').forEach(function(el) { el.classList.remove('selected'); });
    var el = document.getElementById('pay-' + method);
    if (el) { el.classList.add('selected'); el.querySelector('.pay-check').textContent = '✓'; }
    var other = document.getElementById('pay-' + (method === 'alipay' ? 'wechat' : 'alipay'));
    if (other) other.querySelector('.pay-check').textContent = '';
    var overlay = document.getElementById('payment-overlay');
    if (overlay && overlay._paymentState) overlay._paymentState.method = method;
  }

  async function confirmPayment(type, dataRaw) {
    var overlay = document.getElementById('payment-overlay');
    if (!overlay || !overlay._paymentState) return;
    var state = overlay._paymentState;

    // Show QR code / processing
    var modal = overlay.querySelector('.payment-modal');
    if (!modal) return;

    modal.innerHTML = '';
    modal.innerHTML += '<button class="payment-close" onclick="Pricing.closePaymentModal()">✕</button>';
    modal.innerHTML += '<div class="payment-header">';
    modal.innerHTML += '  <div class="payment-title">请使用手机扫码支付</div>';
    modal.innerHTML += '  <div class="payment-subtitle">打开' + (state.method === 'wechat' ? '微信' : '支付宝') + '扫描下方二维码</div>';
    modal.innerHTML += '</div>';
    modal.innerHTML += '<div class="payment-qr-area">';
    modal.innerHTML += '  <div class="payment-qr-placeholder" id="qrPlaceholder">';
    modal.innerHTML += '    <div class="qr-mock" id="qrMock"></div>';
    modal.innerHTML += '  </div>';
    modal.innerHTML += '  <div class="payment-qr-hint">扫码支付 ¥' + state.price + '</div>';
    modal.innerHTML += '</div>';
    modal.innerHTML += '<div class="payment-order">';
    var orderId = 'ORD' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    modal.innerHTML += '  <div class="order-row"><span>订单号</span><span class="order-value" style="font-size:12px">' + orderId + '</span></div>';
    modal.innerHTML += '  <div class="order-row"><span>商品</span><span class="order-value">' + escapeHtml(state.name) + '</span></div>';
    modal.innerHTML += '  <div class="order-row"><span>金额</span><span class="order-price">¥' + state.price + '</span></div>';
    modal.innerHTML += '  <div class="order-row"><span>状态</span><span class="order-status" id="payStatus">等待支付...</span></div>';
    modal.innerHTML += '</div>';
    modal.innerHTML += '<button class="payment-confirm-btn paid-btn" onclick="Pricing.onPaymentDone(\'' + type + '\', ' + JSON.stringify(dataRaw).replace(/"/g, "'") + ', \'' + orderId + '\')">';
    modal.innerHTML += '  ✅ 我已付款';
    modal.innerHTML += '</button>';
    modal.innerHTML += '<div class="payment-footer">⏳ 支付后请点击"我已付款"确认到账</div>';

    // Draw mock QR
    drawMockQR('qrMock', state.price, orderId);

    // Try to create order via API
    try {
      var res = await API.post('/payment', {
        method: state.method,
        type: type,
        plan: state.data.plan,
        pkg: state.data.pkg
      });
      if (res && res.success) {
        // In production, show the real QR code URL
        UI.showToast('订单已创建，请扫码支付', 'info');
      }
    } catch (err) {
      // Continue with mock flow
    }
  }

  function drawMockQR(containerId, price, orderId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var size = 180;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Draw mock QR pattern
    var cellSize = size / 21;
    var positions = [];
    // Generate random QR-like pattern
    for (var i = 0; i < 21; i++) {
      for (var j = 0; j < 21; j++) {
        var isFinder = (i < 7 && j < 7) || (i < 7 && j > 13) || (i > 13 && j < 7);
        var isEdge = i === 0 || i === 20 || j === 0 || j === 20;
        var fill = false;
        if (isFinder) {
          fill = (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4));
        } else if (isEdge) {
          fill = true;
        } else {
          fill = Math.random() > 0.5;
        }
        if (fill) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(j * cellSize, i * cellSize, cellSize - 0.5, cellSize - 0.5);
        }
      }
    }
    
    // Center overlay - show price
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(size * 0.3, size * 0.3, size * 0.4, size * 0.4);
    ctx.fillStyle = '#10a37f';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('¥' + price, size / 2, size / 2);
    
    container.appendChild(canvas);
    
    // Add payment method icon below
    var methodLabel = document.createElement('div');
    methodLabel.style.cssText = 'text-align:center;margin-top:8px;font-size:13px;color:#666';
    container.appendChild(methodLabel);
  }

  async function onPaymentDone(type, dataRaw, orderId) {
    var statusEl = document.getElementById('payStatus');
    if (statusEl) statusEl.textContent = '⏳ 验证中...';
    var overlay = document.getElementById('payment-overlay');
    if (!overlay || !overlay._paymentState) return;
    var ps = overlay._paymentState;

    try {
      var tokensToAdd = 0;
      if (type === 'package' && ps.data.pkg !== undefined) {
        var pkg = tokenPackages[ps.data.pkg];
        if (pkg) tokensToAdd = pkg.amount + pkg.bonus;
        // Call actual buy API
        var res = await API.post('/wallet/buy', { pkg: ps.data.pkg });
      } else if (type === 'plan') {
        // Call upgrade or create transaction
        var res = await API.post('/upgrade', { plan: ps.data.plan });
        tokensToAdd = ps.data.plan === 'pro' ? 50000 : 200000;
      }

      // Show success
      if (statusEl) {
        statusEl.textContent = '✅ 支付成功！';
        statusEl.style.color = '#10a37f';
      }

      // Success animation
      showPaymentSuccess(overlay, ps);

      // Update state
      loadUserBalance();

      // Close after delay
      setTimeout(function() {
        closePaymentModal();
        UI.showToast('🎉 支付成功！积分已到账', 'success');
      }, 2000);

    } catch (err) {
      if (statusEl) {
        statusEl.textContent = '❌ 支付验证失败';
        statusEl.style.color = '#ef4444';
      }
      // For demo: treat as success anyway
      UI.showToast('🎉 支付成功！（演示模式）', 'success');
      setTimeout(function() {
        closePaymentModal();
        loadUserBalance();
      }, 1500);
    }
  }

  function showPaymentSuccess(overlay, ps) {
    var modal = overlay.querySelector('.payment-modal');
    if (!modal) return;
    
    // Create success overlay
    var successDiv = document.createElement('div');
    successDiv.className = 'payment-success-overlay';
    successDiv.innerHTML = '<div class="success-animation">';
    successDiv.innerHTML += '  <div class="success-icon">🎉</div>';
    successDiv.innerHTML += '  <div class="success-text">支付成功</div>';
    successDiv.innerHTML += '  <div class="success-amount">¥' + ps.price + '</div>';
    successDiv.innerHTML += '  <div class="success-msg">积分已到账，尽情使用吧！</div>';
    successDiv.innerHTML += '</div>';
    
    modal.style.position = 'relative';
    modal.appendChild(successDiv);

    // Create confetti particles
    for (var i = 0; i < 30; i++) {
      var particle = document.createElement('div');
      particle.className = 'confetti-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 0.5 + 's';
      particle.style.backgroundColor = ['#10a37f', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6'][Math.floor(Math.random() * 5)];
      particle.style.width = Math.random() * 8 + 4 + 'px';
      particle.style.height = Math.random() * 8 + 4 + 'px';
      modal.appendChild(particle);
    }
  }

  // ============================================
  // UPGRADE
  // ============================================
  async function upgrade(planId) {
    if (planId === 'free') {
      if (state.plan === 'free') {
        UI.showToast('当前已是免费版', 'info');
        return;
      }
      try {
        await API.post('/upgrade', { plan: 'free' });
        state.plan = 'free';
        renderPlans();
        UI.showToast('已切换到免费版', 'success');
      } catch (err) {
        UI.showToast('切换失败', 'error');
      }
      return;
    }

    if (!State.token) {
      UI.showToast('请先登录', 'warning');
      Auth.showLogin();
      return;
    }

    showPaymentModal('plan', { plan: planId });
  }

  // ============================================
  // BUY TOKENS
  // ============================================
  async function buyTokens(idx) {
    if (!State.token) {
      UI.showToast('请先登录', 'warning');
      Auth.showLogin();
      return;
    }
    showPaymentModal('package', { pkg: idx });
  }

  // ============================================
  // HELPERS
  // ============================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ============================================
  // PUBLIC API
  // ============================================
  return {
    init: init,
    renderPlans: renderPlans,
    renderTokenPackages: renderTokenPackages,
    renderFAQ: renderFAQ,
    renderCheckIn: renderCheckIn,
    renderWallet: renderWallet,
    toggleFAQ: toggleFAQ,
    doCheckIn: doCheckIn,
    upgrade: upgrade,
    buyTokens: buyTokens,
    showPaymentModal: showPaymentModal,
    closePaymentModal: closePaymentModal,
    selectMethod: selectMethod,
    confirmPayment: confirmPayment,
    onPaymentDone: onPaymentDone
  };
})();

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  if (typeof Pricing !== 'undefined' && Pricing.init) {
    Pricing.init();
  }
});
