// ===== API 适配层（连接后端） =====
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api';

const api = {
    // 设置 token
    setToken(token) {
        localStorage.setItem('auth_token', token);
    },

    getToken() {
        return localStorage.getItem('auth_token');
    },

    // 通用请求
    async request(path, options = {}) {
        const token = this.getToken();
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '请求失败');
        return data;
    },

    // 注册
    register(email, password, nickname) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, nickname })
        });
    },

    // 登录
    login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    // 获取用户信息
    getProfile() {
        return this.request('/user/profile');
    },

    // AI 对话（通过后端代理）
    chat(messages, model) {
        return this.request('/chat/completions', {
            method: 'POST',
            body: JSON.stringify({ messages, model })
        });
    },

    // AI 绘画
    generateImage(prompt, size = '1024x1024', n = 1) {
        return this.request('/image/generations', {
            method: 'POST',
            body: JSON.stringify({ prompt, size, n })
        });
    },

    // 创建订单
    createOrder(plan, paymentMethod = 'alipay') {
        return this.request('/payment/create', {
            method: 'POST',
            body: JSON.stringify({ plan, payment_method: paymentMethod })
        });
    },

    // 支付
    pay(orderNo, method) {
        return this.request(`/payment/${method}`, {
            method: 'POST',
            body: JSON.stringify({ order_no: orderNo })
        });
    },

    // 查询订单
    getOrderStatus(orderNo) {
        return this.request(`/payment/status/${orderNo}`);
    },

    // 获取订单列表
    getOrders() {
        return this.request('/payment/orders');
    },

    // 健康检查
    health() {
        return this.request('/health');
    }
};

// 导出
window.api = api;