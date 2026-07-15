// ===== 状态管理 =====
const state = {
    apiKey: localStorage.getItem('ai_api_key') || '',
    apiBase: localStorage.getItem('ai_api_base') || 'https://api.openai.com/v1',
    messages: [],
    isProcessing: false,
    model: localStorage.getItem('ai_model') || 'gpt-4',
    isLightTheme: localStorage.getItem('ai_theme') === 'light',
    isRecording: false,
    recognition: null,
    lastAiMessage: ''
};

// ===== DOM 引用 =====
const dom = {
    navLinks: document.getElementById('navLinks'),
    navToggle: document.getElementById('navToggle'),
    navbar: document.querySelector('.navbar'),
    chatMessages: document.getElementById('chatMessages'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),
    modelSelect: document.getElementById('modelSelect'),
    suggestionChips: document.querySelectorAll('.chip'),
    apiModal: document.getElementById('apiModal'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    apiBaseInput: document.getElementById('apiBaseInput'),
    modalClose: document.getElementById('modalClose'),
    modalCancel: document.getElementById('modalCancel'),
    modalSave: document.getElementById('modalSave'),
    toggleKey: document.getElementById('toggleKey'),
    typingTemplate: document.getElementById('typingTemplate'),
    // 新功能
    themeToggle: document.getElementById('themeToggle'),
    voiceInputBtn: document.getElementById('voiceInputBtn'),
    readAloudBtn: document.getElementById('readAloudBtn'),
    exportChatBtn: document.getElementById('exportChatBtn'),
    shareChatBtn: document.getElementById('shareChatBtn'),
    clearChatBtn: document.getElementById('clearChatBtn'),
    imagePrompt: document.getElementById('imagePrompt'),
    generateImageBtn: document.getElementById('generateImageBtn'),
    imageResults: document.getElementById('imageResults'),
    imageSize: document.getElementById('imageSize'),
    imageCount: document.getElementById('imageCount')
};

// ===== Toast 通知系统 =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer') || (() => {
        const c = document.createElement('div');
        c.id = 'toastContainer';
        c.className = 'toast-container';
        document.body.appendChild(c);
        return c;
    })();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== 导航栏交互 =====
dom.navToggle.addEventListener('click', () => dom.navLinks.classList.toggle('show'));
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        dom.navLinks.classList.remove('show');
        document.querySelector('.nav-links a.active')?.classList.remove('active');
        link.classList.add('active');
    });
});
window.addEventListener('scroll', () => dom.navbar.classList.toggle('scrolled', window.scrollY > 50));

// ===== 统计数字动画 =====
function animateCounters() {
    document.querySelectorAll('.stat-number').forEach(counter => {
        const target = parseInt(counter.dataset.target);
        const duration = 2000;
        const step = Math.ceil(target / (duration / 16));
        let current = 0;
        const update = () => {
            current += step;
            counter.textContent = current >= target ? target.toLocaleString() : current.toLocaleString();
            if (current < target) requestAnimationFrame(update);
        };
        update();
    });
}
let countersAnimated = false;
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !countersAnimated) {
            countersAnimated = true;
            animateCounters();
        }
    });
}, { threshold: 0.3 });
const aboutSection = document.querySelector('.about');
if (aboutSection) observer.observe(aboutSection);

// ===== 功能卡片渐入动画 =====
document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, parseInt(entry.target.dataset.delay) || 0);
            }
        });
    }, { threshold: 0.1 }).observe(card);
});

// ===== 自动调整输入框高度 =====
dom.userInput.addEventListener('input', () => {
    dom.userInput.style.height = 'auto';
    dom.userInput.style.height = Math.min(dom.userInput.scrollHeight, 150) + 'px';
});
dom.userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

// ===== 发送消息 =====
async function sendMessage() {
    const text = dom.userInput.value.trim();
    if (!text || state.isProcessing) return;

    dom.userInput.value = '';
    dom.userInput.style.height = 'auto';

    addMessage(text, 'user');
    state.messages.push({ role: 'user', content: text });

    if (!state.apiKey) {
        dom.apiModal.classList.add('active');
        dom.apiKeyInput.focus();
        return;
    }

    const typingEl = showTypingIndicator();
    state.isProcessing = true;
    dom.sendBtn.disabled = true;

    try {
        await callAI(text);
    } catch (error) {
        removeTypingIndicator(typingEl);
        addMessage(`抱歉，请求出错了：${error.message}`, 'ai');
    } finally {
        state.isProcessing = false;
        dom.sendBtn.disabled = false;
    }
}

function addMessage(text, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = formatMessage(text);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    dom.chatMessages.appendChild(messageDiv);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;

    if (role === 'ai') state.lastAiMessage = text;

    // 保存聊天到 localStorage
    saveChatToLocal();

    return messageDiv;
}

function formatMessage(text) {
    // 转义 HTML
    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    // 先转义，然后渲染 Markdown 风格

    // 代码块
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code class="language-${lang || 'plaintext'}">${escapeHtml(code.trim())}</code></pre>`;
    });

    // 行内代码
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 表格
    text = text.replace(/\n\|(.+)\|(.+)\|/g, (match) => {
        const rows = match.trim().split('\n');
        let table = '<table>';
        rows.forEach((row, idx) => {
            if (idx === 1 && row.match(/^[\s\|:-]+$/)) return; // 分隔行
            const cells = row.split('|').filter(c => c.trim());
            const tag = idx === 1 ? 'th' : 'td';
            table += '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
        });
        return table + '</table>';
    });

    // 引用
    text = text.replace(/^&gt;\s?(.+)$/gm, '<blockquote>$1</blockquote>');

    // 加粗和斜体
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 链接
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // 无序列表
    text = text.replace(/^[\s]*[-*]\s(.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // 有序列表
    text = text.replace(/^[\s]*\d+\.\s(.+)$/gm, '<li>$1</li>');

    // 标题
    text = text.replace(/^####\s(.+)$/gm, '<h4>$1</h4>');
    text = text.replace(/^###\s(.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^##\s(.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^#\s(.+)$/gm, '<h1>$1</h1>');

    // 换行
    text = text.replace(/\n/g, '<br>');

    return text;
}

function showTypingIndicator() {
    const template = dom.typingTemplate.content.cloneNode(true);
    const el = template.firstElementChild;
    dom.chatMessages.appendChild(el);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    return el;
}

function removeTypingIndicator(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
}

// ===== AI API 调用 =====
async function callAI(userText) {
    const response = await fetch(`${state.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify({
            model: state.model,
            messages: [
                { role: 'system', content: '你是一个智能、友好、全面的AI助手。请用中文回答用户的问题。回答时可以使用Markdown格式（加粗、列表、代码块、表格等）让回复更清晰。' },
                ...state.messages.slice(-10)
            ],
            temperature: 0.7,
            max_tokens: 3000
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    const typingEl = dom.chatMessages.querySelector('.typing-indicator');
    removeTypingIndicator(typingEl);

    addMessage(reply, 'ai');
    state.messages.push({ role: 'assistant', content: reply });

    return reply;
}

// ===== 图片生成 (DALL-E) =====
async function generateImage() {
    const prompt = dom.imagePrompt.value.trim();
    if (!prompt) {
        showToast('请输入图片描述', 'error');
        return;
    }

    if (!state.apiKey) {
        dom.apiModal.classList.add('active');
        dom.apiKeyInput.focus();
        return;
    }

    const size = dom.imageSize.value;
    const count = parseInt(dom.imageCount.value);

    // 显示加载状态
    dom.imageResults.innerHTML = `
        <div class="imagegen-loading">
            <div class="spinner"></div>
            <p>🎨 AI 正在创作中...</p>
        </div>
    `;

    dom.generateImageBtn.disabled = true;

    try {
        const response = await fetch(`${state.apiBase}/images/generations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiKey}`
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: prompt,
                n: count,
                size: size,
                quality: 'standard'
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();

        let html = '';
        data.data.forEach((img, idx) => {
            html += `
                <div class="imagegen-result-item">
                    <img src="${img.url}" alt="AI 生成图片 ${idx + 1}" loading="lazy" />
                    <div class="imagegen-actions">
                        <button onclick="window.open('${img.url}','_blank')">
                            <i class="fas fa-external-link-alt"></i> 查看原图
                        </button>
                        <button onclick="downloadImage('${img.url}', 'ai-image-${idx + 1}')">
                            <i class="fas fa-download"></i> 下载
                        </button>
                    </div>
                </div>
            `;
        });

        dom.imageResults.innerHTML = html;
        showToast(`✨ 已生成 ${count} 张图片！`, 'success');

        // 同时也添加到聊天记录
        addMessage(`🎨 **AI 图片生成**\n\n"${prompt}"\n\n[查看生成的图片](${data.data[0].url})`, 'ai');

    } catch (error) {
        dom.imageResults.innerHTML = `
            <div class="imagegen-placeholder">
                <i class="fas fa-exclamation-triangle" style="color:#e74c3c;"></i>
                <p>生成失败：${error.message}</p>
            </div>
        `;
        showToast(`生成失败：${error.message}`, 'error');
    } finally {
        dom.generateImageBtn.disabled = false;
    }
}

function downloadImage(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.png`;
    a.target = '_blank';
    a.click();
    showToast('正在下载...', 'info');
}

// ===== 主题切换 =====
function toggleTheme() {
    state.isLightTheme = !state.isLightTheme;
    document.body.classList.toggle('light-theme', state.isLightTheme);
    localStorage.setItem('ai_theme', state.isLightTheme ? 'light' : 'dark');

    const icon = dom.themeToggle.querySelector('i');
    icon.className = state.isLightTheme ? 'fas fa-sun' : 'fas fa-moon';

    showToast(state.isLightTheme ? '☀️ 已切换为浅色模式' : '🌙 已切换为深色模式', 'info');
}

// 初始化主题
if (state.isLightTheme) {
    document.body.classList.add('light-theme');
    dom.themeToggle.querySelector('i').className = 'fas fa-sun';
}

// ===== 语音输入 =====
function toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast('您的浏览器不支持语音输入，请使用 Chrome 浏览器', 'error');
        return;
    }

    if (state.isRecording) {
        stopVoiceInput();
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    state.recognition = new SpeechRecognition();
    state.recognition.lang = 'zh-CN';
    state.recognition.continuous = false;
    state.recognition.interimResults = true;

    state.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        dom.userInput.value = transcript;
        dom.userInput.style.height = 'auto';
        dom.userInput.style.height = Math.min(dom.userInput.scrollHeight, 150) + 'px';
    };

    state.recognition.onend = () => {
        state.isRecording = false;
        dom.voiceInputBtn.classList.remove('recording');
        dom.voiceInputBtn.querySelector('i').className = 'fas fa-microphone';
        if (dom.userInput.value.trim()) {
            sendMessage();
        }
    };

    state.recognition.onerror = (event) => {
        state.isRecording = false;
        dom.voiceInputBtn.classList.remove('recording');
        dom.voiceInputBtn.querySelector('i').className = 'fas fa-microphone';
        showToast(`语音识别出错：${event.error}`, 'error');
    };

    state.isRecording = true;
    dom.voiceInputBtn.classList.add('recording');
    dom.voiceInputBtn.querySelector('i').className = 'fas fa-microphone-slash';
    state.recognition.start();
}

function stopVoiceInput() {
    if (state.recognition) {
        state.recognition.stop();
        state.recognition = null;
    }
    state.isRecording = false;
    dom.voiceInputBtn.classList.remove('recording');
    dom.voiceInputBtn.querySelector('i').className = 'fas fa-microphone';
}

// ===== 朗读回复 =====
function readAloud() {
    if (!state.lastAiMessage) {
        showToast('没有可朗读的 AI 回复', 'info');
        return;
    }

    if ('speechSynthesis' in window) {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            dom.readAloudBtn.classList.remove('active');
            showToast('⏹ 已停止朗读', 'info');
            return;
        }

        const utterance = new SpeechSynthesisUtterance(state.lastAiMessage.replace(/<[^>]+>/g, ''));
        utterance.lang = 'zh-CN';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            dom.readAloudBtn.classList.add('active');
            showToast('🔊 正在朗读...', 'info');
        };
        utterance.onend = () => {
            dom.readAloudBtn.classList.remove('active');
        };
        utterance.onerror = () => {
            dom.readAloudBtn.classList.remove('active');
        };

        window.speechSynthesis.speak(utterance);
    } else {
        showToast('您的浏览器不支持朗读功能', 'error');
    }
}

// ===== 导出对话 =====
function exportChat() {
    if (state.messages.length === 0) {
        showToast('没有对话可导出', 'info');
        return;
    }

    let text = '# AI 智能助手 - 对话记录\n\n';
    state.messages.forEach(msg => {
        const role = msg.role === 'user' ? '👤 我' : '🤖 AI';
        text += `## ${role}\n${msg.content}\n\n---\n\n`;
    });

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `AI对话_${date}.md`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('✅ 对话已导出！', 'success');
}

// ===== 分享对话 =====
function shareChat() {
    if (state.messages.length === 0) {
        showToast('没有对话可分享', 'info');
        return;
    }

    // 生成分享文本
    let shareText = '🤖 AI 智能助手 - 对话分享\n\n';
    state.messages.forEach(msg => {
        const role = msg.role === 'user' ? '👤' : '🤖';
        const content = msg.content.replace(/<[^>]+>/g, '').slice(0, 200);
        shareText += `${role} ${content}\n\n`;
    });
    shareText += '\n—— 来自 www.fjrxb.beauty';

    // 复制到剪贴板
    navigator.clipboard.writeText(shareText).then(() => {
        showToast('📋 对话已复制到剪贴板，可以粘贴分享了！', 'success');
    }).catch(() => {
        // 降级方案：显示在弹窗里
        const existing = document.querySelector('.share-link-box');
        if (existing) existing.remove();

        const box = document.createElement('div');
        box.className = 'share-link-box';
        box.innerHTML = `
            <input type="text" value="${encodeURIComponent(shareText.slice(0, 100))}..." readonly />
            <button onclick="this.previousElementSibling.select();document.execCommand('copy');showToast('已复制','success')">
                <i class="fas fa-copy"></i> 复制
            </button>
        `;
        dom.chatMessages.parentElement.appendChild(box);
        showToast('📋 已生成分享文本', 'info');
    });
}

// ===== 清空对话 =====
function clearChat() {
    if (state.messages.length === 0) {
        showToast('对话已经是空的', 'info');
        return;
    }

    if (confirm('确定要清空所有对话吗？')) {
        state.messages = [];
        state.lastAiMessage = '';
        dom.chatMessages.innerHTML = `
            <div class="message ai-message">
                <div class="message-avatar"><i class="fas fa-robot"></i></div>
                <div class="message-content">
                    <p>你好！我是 AI 智能助手 👋</p>
                    <p>对话已清空，有什么我可以帮你的？</p>
                </div>
            </div>
        `;
        localStorage.removeItem('ai_chat_history');
        showToast('🗑️ 对话已清空', 'info');
    }
}

// ===== 本地保存聊天记录 =====
function saveChatToLocal() {
    try {
        const toSave = state.messages.slice(-50); // 只保留最近50条
        localStorage.setItem('ai_chat_history', JSON.stringify(toSave));
    } catch (e) {
        // localStorage 可能满了
    }
}

function loadChatFromLocal() {
    try {
        const saved = localStorage.getItem('ai_chat_history');
        if (saved) {
            const history = JSON.parse(saved);
            if (Array.isArray(history) && history.length > 0) {
                state.messages = history;
                // 清除默认欢迎消息
                dom.chatMessages.innerHTML = '';
                history.forEach(msg => {
                    addMessage(msg.content, msg.role);
                });
                return true;
            }
        }
    } catch (e) {}
    return false;
}

// ===== 快捷指令 =====
dom.suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
        dom.userInput.value = chip.dataset.prompt;
        dom.userInput.style.height = 'auto';
        dom.userInput.style.height = Math.min(dom.userInput.scrollHeight, 150) + 'px';
        dom.userInput.focus();
    });
});

// ===== 事件绑定 =====
dom.sendBtn.addEventListener('click', sendMessage);
dom.modelSelect.addEventListener('change', () => {
    state.model = dom.modelSelect.value;
    localStorage.setItem('ai_model', state.model);
});
dom.themeToggle.addEventListener('click', toggleTheme);
dom.voiceInputBtn.addEventListener('click', toggleVoiceInput);
dom.readAloudBtn.addEventListener('click', readAloud);
dom.exportChatBtn.addEventListener('click', exportChat);
dom.shareChatBtn.addEventListener('click', shareChat);
dom.clearChatBtn.addEventListener('click', clearChat);
dom.generateImageBtn.addEventListener('click', generateImage);
dom.imagePrompt.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') generateImage();
});

// ===== API Key 弹窗 =====
dom.modalClose.addEventListener('click', () => dom.apiModal.classList.remove('active'));
dom.modalCancel.addEventListener('click', () => dom.apiModal.classList.remove('active'));
dom.apiModal.addEventListener('click', (e) => {
    if (e.target === dom.apiModal) dom.apiModal.classList.remove('active');
});

dom.toggleKey.addEventListener('click', () => {
    const icon = dom.toggleKey.querySelector('i');
    if (dom.apiKeyInput.type === 'password') {
        dom.apiKeyInput.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        dom.apiKeyInput.type = 'password';
        icon.className = 'fas fa-eye';
    }
});

dom.modalSave.addEventListener('click', () => {
    const key = dom.apiKeyInput.value.trim();
    const base = dom.apiBaseInput.value.trim();
    if (!key) { alert('请输入 API Key'); return; }

    state.apiKey = key;
    if (base) state.apiBase = base;
    localStorage.setItem('ai_api_key', key);
    localStorage.setItem('ai_api_base', state.apiBase);

    dom.apiModal.classList.remove('active');

    // 继续发送缓存的用户消息
    if (state.messages.length > 0 && !state.isProcessing) {
        const lastMsg = state.messages[state.messages.length - 1];
        if (lastMsg.role === 'user') {
            const typingEl = showTypingIndicator();
            state.isProcessing = true;
            dom.sendBtn.disabled = true;
            callAI(lastMsg.content)
                .catch(err => { removeTypingIndicator(typingEl); addMessage(`抱歉：${err.message}`, 'ai'); })
                .finally(() => { state.isProcessing = false; dom.sendBtn.disabled = false; });
        }
    }
});

// ===== 键盘快捷键 =====
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        dom.apiModal.classList.add('active');
        dom.apiKeyInput.focus();
    }
    // Ctrl+Enter 发送
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.activeElement === dom.userInput) sendMessage();
    }
});

// ===== 初始化 =====
(function init() {
    if (state.apiKey) dom.apiKeyInput.value = state.apiKey;
    if (localStorage.getItem('ai_api_base')) dom.apiBaseInput.value = localStorage.getItem('ai_api_base');
    if (localStorage.getItem('ai_model')) dom.modelSelect.value = localStorage.getItem('ai_model');

    // 加载聊天历史
    loadChatFromLocal();

    console.log('%c 🚀 AI 智能助手 v2.0 ', 'background: linear-gradient(135deg, #6c5ce7, #00cec9); color: white; font-size: 16px; padding: 10px 20px; border-radius: 8px; font-weight: bold;');
    console.log('📌 快捷键: Ctrl+K 设置 | Ctrl+Enter 发送');
    console.log('🎤 语音输入 | 🔊 朗读 | 📤 导出 | 🔗 分享');
})();
// ===== 定价页面交互 =====
// 月付/年付切换
const priceToggle = document.getElementById('priceToggle');
const toggleLabels = document.querySelectorAll('.toggle-label');
const monthPrices = document.querySelectorAll('.month-price');
const monthPeriods = document.querySelectorAll('.month-period');
const monthSaves = document.querySelectorAll('.month-save');

if (priceToggle) {
    priceToggle.addEventListener('change', () => {
        const isYearly = priceToggle.checked;

        toggleLabels.forEach(label => {
            label.classList.toggle('active', 
                (label.dataset.period === 'year' && isYearly) ||
                (label.dataset.period === 'month' && !isYearly)
            );
        });

        monthPrices.forEach(el => {
            el.textContent = '¥' + el.dataset[isYearly ? 'year' : 'month'];
        });

        monthPeriods.forEach(el => {
            el.textContent = el.dataset[isYearly ? 'year' : 'month'];
        });

        monthSaves.forEach(el => {
            el.textContent = el.dataset[isYearly ? 'year' : 'month'] || '';
        });
    });
}

// 倒计时
let countdownTimer = document.getElementById('countdownTimer');
if (countdownTimer) {
    // 设置截止时间为明天中午12点
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + 1);
    endTime.setHours(12, 0, 0, 0);

    function updateCountdown() {
        const now = new Date();
        const diff = endTime - now;
        if (diff <= 0) {
            countdownTimer.textContent = '已结束';
            return;
        }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        countdownTimer.textContent = 
            `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// 定价按钮点击
document.querySelectorAll('.pricing-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const card = this.closest('.pricing-card');
        const planName = card.querySelector('h3').textContent;
        const price = card.querySelector('.price').textContent;
        const isYearly = document.getElementById('priceToggle')?.checked || false;

        if (this.textContent.includes('当前使用中')) {
            showToast('你当前使用的是免费版', 'info');
            return;
        }

        // 判断是否有 API Key（作为简易登录判断）
        if (!state.apiKey) {
            showToast('请先配置 API Key（按 Ctrl+K）后再开通会员', 'info');
            dom.apiModal.classList.add('active');
            return;
        }

        // 模拟支付弹窗
        showPaymentModal(planName, price, isYearly);
    });
});

// ===== 支付弹窗 =====
function showPaymentModal(plan, price, isYearly) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.innerHTML = `
        <div class="modal" style="max-width:520px;">
            <div class="modal-header">
                <h3><i class="fas fa-credit-card"></i> 确认订单</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="background:var(--bg-input);border-radius:12px;padding:20px;margin-bottom:20px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                        <span style="color:var(--text-secondary);">${plan}</span>
                        <span style="font-weight:700;font-size:1.2rem;background:var(--gradient-1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${price}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                        <span style="color:var(--text-secondary);">周期</span>
                        <span>${isYearly ? '年付' : plan.includes('月') ? '月付' : plan.includes('季') ? '季付' : '一次性'}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid var(--border-color);">
                        <span style="font-weight:600;">合计</span>
                        <span style="font-weight:700;font-size:1.3rem;color:var(--accent);">${price}</span>
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <button onclick="simulatePayment(this)" class="btn btn-primary" style="width:100%;justify-content:center;padding:16px;">
                        <i class="fab fa-alipay"></i> 支付宝支付
                    </button>
                    <button onclick="simulatePayment(this)" class="btn btn-secondary" style="width:100%;justify-content:center;padding:16px;">
                        <i class="fab fa-weixin"></i> 微信支付
                    </button>
                </div>
                <p style="text-align:center;color:var(--text-muted);font-size:0.8rem;margin-top:12px;">
                    🔒 支付信息加密传输 · 7天无理由退款
                </p>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function simulatePayment(btn) {
    btn.textContent = '⏳ 处理中...';
    btn.disabled = true;

    setTimeout(() => {
        const modal = btn.closest('.modal-overlay');
        if (modal) modal.remove();

        showToast('🎉 支付成功！会员已开通，感谢支持！', 'success');

        // 模拟会员状态
        localStorage.setItem('ai_member', JSON.stringify({
            plan: '月卡会员',
            expireAt: Date.now() + 30 * 24 * 3600000,
            activatedAt: Date.now()
        }));

        updateMemberUI();
    }, 2000);
}

// ===== 会员状态管理 =====
function updateMemberUI() {
    const memberData = localStorage.getItem('ai_member');
    const memberStatus = document.querySelector('.membership-status');

    if (memberData && memberStatus) {
        const member = JSON.parse(memberData);
        if (member.expireAt > Date.now()) {
            memberStatus.classList.add('show');
            memberStatus.innerHTML = `<i class="fas fa-crown" style="color:#f1c40f;"></i> ${member.plan} 会员`;
        } else {
            memberStatus.classList.remove('show');
            localStorage.removeItem('ai_member');
        }
    }
}

// 初始化会员状态
updateMemberUI();