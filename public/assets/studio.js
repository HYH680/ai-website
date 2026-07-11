/* ============================================================
   studio.js - Image Generation Module
   ============================================================ */

var Studio = (function() {
  'use strict';

  var state = {
    prompt: '',
    style: '写实',
    ratio: '1:1',
    quality: '标准',
    referenceImage: null,
    isGenerating: false
  };

  var ratioDimensions = {
    '1:1': { w: 1024, h: 1024 },
    '16:9': { w: 1344, h: 768 },
    '9:16': { w: 768, h: 1344 },
    '4:3': { w: 1152, h: 896 },
    '3:4': { w: 896, h: 1152 }
  };

  var examplePrompts = [
    '一只可爱的橘猫坐在窗台上，阳光洒进来',
    '未来城市夜景，赛博朋克风格，霓虹灯光',
    '水彩风格的山水画，远山如黛',
    '3D渲染的科幻机器人，细节丰富'
  ];

  function init() {
    renderHistory();
  }

  function renderHistory() {
    var grid = document.getElementById('image-grid');
    if (!grid) return;

    var history = State.studioHistory || [];

    if (history.length === 0) {
      grid.innerHTML = '';
      var emptyEl = document.querySelector('.studio-empty');
      if (emptyEl) emptyEl.style.display = 'flex';
      return;
    }

    var emptyEl = document.querySelector('.studio-empty');
    if (emptyEl) emptyEl.style.display = 'none';

    var html = '';
    history.forEach(function(img, idx) {
      html += '<div class="image-card" onclick="Studio.showDetail(' + idx + ')">';
      html += '  <img class="card-img" src="' + escapeAttr(img.url) + '" alt="' + escapeAttr(img.prompt) + '" loading="lazy">';
      html += '  <div class="card-overlay">';
      html += '    <button class="card-overlay-btn" onclick="event.stopPropagation();Studio.downloadImage(' + idx + ')" title="下载">⬇</button>';
      html += '    <button class="card-overlay-btn" onclick="event.stopPropagation();Studio.regenerateImage(' + idx + ')" title="重新生成">🔄</button>';
      html += '  </div>';
      html += '  <div class="card-info">';
      html += '    <div class="card-prompt">' + escapeHtml(img.prompt) + '</div>';
      html += '    <div class="card-meta">';
      html += '      <span>' + (img.style || "") + ' · ' + (img.ratio || "") + '</span>';
      html += '      <span>' + formatDate(img.createdAt) + '</span>';
      html += '    </div>';
      html += '  </div>';
      html += '</div>';
    });

    grid.innerHTML = html;

    var countEl = document.getElementById('history-count');
    if (countEl) {
      countEl.textContent = '(' + history.length + ' 张)';
    }
  }

  function setPrompt(value) {
    state.prompt = value;
    var textarea = document.getElementById('studio-prompt');
    if (textarea) {
      textarea.value = value;
      var countEl = document.getElementById('char-count');
      if (countEl) countEl.textContent = value.length + '/500';
    }
  }

  function setStyle(style) {
    state.style = style;
    var btns = document.querySelectorAll('.style-preset-btn');
    btns.forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-style') === style);
    });
  }

  function setRatio(ratio) {
    state.ratio = ratio;
    var btns = document.querySelectorAll('.ratio-preset-btn');
    btns.forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-ratio') === ratio);
    });
  }

  function setQuality(quality) {
    state.quality = quality;
    var btns = document.querySelectorAll('.quality-btn');
    btns.forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-quality') === quality);
    });
  }

  function handleUpload() {
    var input = document.getElementById('ref-upload-input');
    if (!input) {
      input = document.createElement('input');
      input.id = 'ref-upload-input';
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (file) {
          var reader = new FileReader();
          reader.onload = function(ev) {
            state.referenceImage = ev.target.result;
            showUploadPreview(ev.target.result);
          };
          reader.readAsDataURL(file);
        }
      });
    }
    input.click();
  }

  function showUploadPreview(dataUrl) {
    var preview = document.getElementById('upload-preview');
    var uploadBox = document.getElementById('upload-box');
    if (preview) {
      preview.classList.add('show');
      preview.querySelector('img').src = dataUrl;
    }
    if (uploadBox) uploadBox.style.display = 'none';
  }

  function removeUpload() {
    state.referenceImage = null;
    var preview = document.getElementById('upload-preview');
    var uploadBox = document.getElementById('upload-box');
    if (preview) preview.classList.remove('show');
    if (uploadBox) uploadBox.style.display = '';
  }

  function useExample(prompt) {
    setPrompt(prompt);
  }

  var generateAbortController = null;

  async function generate() {
    var textarea = document.getElementById('studio-prompt');
    var prompt = textarea ? textarea.value.trim() : '';

    if (!prompt) {
      UI.showToast('请输入描述词', 'warning');
      if (textarea) textarea.focus();
      return;
    }

    if (state.isGenerating) return;

    state.isGenerating = true;
    state.prompt = prompt;

    // Show progress
    var progress = document.getElementById('studio-progress');
    var progressFill = document.getElementById('progress-fill');
    var progressPercent = document.getElementById('progress-percent');
    var progressSteps = document.getElementById('progress-steps');

    if (progress) progress.classList.add('show');
    if (progressFill) progressFill.style.width = '0%';
    if (progressPercent) progressPercent.textContent = '0%';
    if (progressSteps) progressSteps.textContent = '正在准备...';

    var genBtn = document.getElementById('studio-generate-btn');
    if (genBtn) {
      genBtn.disabled = true;
      genBtn.innerHTML = '⏳ 生成中...';
    }

    try {
      // Try to use API
      var useMock = false;
      try {
        var testRes = await fetch('/api/health', { method: 'HEAD', signal: AbortSignal.timeout(2000) });
        if (!testRes.ok) useMock = true;
      } catch (e) {
        useMock = true;
      }

      var imageData;

      if (useMock) {
        // Generate mock image with canvas
        imageData = await generateMockImage(prompt, function(progressVal, stepText) {
          if (progressFill) progressFill.style.width = progressVal + '%';
          if (progressPercent) progressPercent.textContent = progressVal + '%';
          if (progressSteps) progressSteps.textContent = stepText || '';
        });
      } else {
        var data = await API.post('/generate', {
          prompt: prompt,
          style: state.style,
          ratio: state.ratio,
          quality: state.quality,
          reference: state.referenceImage
        });
        imageData = data.url || data.image || data.data;
      }

      // Add to history
      var imgEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        url: imageData,
        prompt: prompt,
        style: state.style,
        ratio: state.ratio,
        quality: state.quality,
        createdAt: new Date().toISOString()
      };

      State.addStudioImage(imgEntry);
      renderHistory();

      // Show success
      UI.showToast('图片生成完成！', 'success');

      // Animate progress to 100
      if (progressFill) progressFill.style.width = '100%';
      if (progressPercent) progressPercent.textContent = '100%';
      if (progressSteps) progressSteps.textContent = '生成完成！';

      setTimeout(function() {
        if (progress) progress.classList.remove('show');
      }, 2000);

    } catch (err) {
      UI.showToast(err.message || '生成失败', 'error');
      if (progress) progress.classList.remove('show');
    }

    state.isGenerating = false;
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.innerHTML = '✨ 生成图片';
    }
  }

  function generateMockImage(prompt, onProgress) {
    return new Promise(function(resolve) {
      var steps = [
        { p: 10, text: '分析描述词...' },
        { p: 25, text: '构图设计中...' },
        { p: 45, text: '渲染细节...' },
        { p: 65, text: '优化色彩...' },
        { p: 85, text: '最终处理...' },
        { p: 95, text: '即将完成...' }
      ];

      var i = 0;
      function nextStep() {
        if (i < steps.length) {
          if (onProgress) onProgress(steps[i].p, steps[i].text);
          i++;
          setTimeout(nextStep, 400);
        } else {
          // Create a placeholder image with canvas
          var canvas = document.createElement('canvas');
          var size = ratioDimensions[state.ratio] || { w: 1024, h: 1024 };
          canvas.width = size.w;
          canvas.height = size.h;

          var ctx = canvas.getContext('2d');

          // Create gradient background
          var gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          var colors = [
            ['#667eea', '#764ba2'],
            ['#f093fb', '#f5576c'],
            ['#4facfe', '#00f2fe'],
            ['#43e97b', '#38f9d7'],
            ['#fa709a', '#fee140'],
            ['#a18cd1', '#fbc2eb']
          ];
          var c = colors[Math.floor(Math.random() * colors.length)];
          gradient.addColorStop(0, c[0]);
          gradient.addColorStop(1, c[1]);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Add some decorative shapes
          var hue = Math.random() * 360;
          for (var j = 0; j < 20; j++) {
            ctx.beginPath();
            ctx.arc(
              Math.random() * canvas.width,
              Math.random() * canvas.height,
              Math.random() * 100 + 20,
              0,
              Math.PI * 2
            );
            ctx.fillStyle = 'hsla(' + hue + ', 70%, 60%, ' + (Math.random() * 0.3 + 0.1) + ')';
            ctx.fill();
          }

          // Add prompt text
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.font = 'bold 28px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✨ AI Generated', canvas.width / 2, canvas.height / 2 - 20);
          ctx.font = '18px -apple-system, sans-serif';
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fillText(prompt.substring(0, 40), canvas.width / 2, canvas.height / 2 + 30);

          var dataUrl = canvas.toDataURL('image/png', 0.9);
          if (onProgress) onProgress(100, '生成完成！');
          setTimeout(function() {
            resolve(dataUrl);
          }, 300);
        }
      }

      nextStep();
    });
  }

  function showDetail(index) {
    var history = State.studioHistory || [];
    var img = history[index];
    if (!img) return;

    var html = '';
    html += '<div class="modal-card wide image-detail-modal">';
    html += '  <div class="modal-header">';
    html += '    <h2>图片详情</h2>';
    html += '    <button class="modal-close" onclick="UI.hideModal()">✕</button>';
    html += '  </div>';
    html += '  <div class="modal-body">';
    html += '    <div class="image-detail-body">';
    html += '      <div class="detail-img-wrap">';
    html += '        <img src="' + escapeAttr(img.url) + '" alt="' + escapeAttr(img.prompt) + '">';
    html += '      </div>';
    html += '      <div class="detail-info">';
    html += '        <h3>描述词</h3>';
    html += '        <div class="detail-prompt">' + escapeHtml(img.prompt) + '</div>';
    html += '        <div class="detail-meta">';
    html += '          <span>风格：' + (img.style || '-') + '</span>';
    html += '          <span>比例：' + (img.ratio || '-') + '</span>';
    html += '          <span>质量：' + (img.quality || '-') + '</span>';
    html += '          <span>创建时间：' + formatDate(img.createdAt) + '</span>';
    html += '        </div>';
    html += '        <div class="detail-actions">';
    html += '          <button class="btn btn-primary btn-block" onclick="Studio.downloadImageByUrl(\'' + escapeAttr(img.url) + '\')">⬇ 下载图片</button>';
    html += '          <button class="btn btn-secondary btn-block" onclick="UI.hideModal();Studio.regenerateImageByIndex(' + index + ')">🔄 重新生成</button>';
    html += '        </div>';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    UI.showModal(html);
  }

  function downloadImage(index) {
    var history = State.studioHistory || [];
    var img = history[index];
    if (!img) return;
    downloadImageByUrl(img.url, img.prompt);
  }

  function downloadImageByUrl(url, filename) {
    var a = document.createElement('a');
    a.href = url;
    a.download = filename ? (filename.substring(0, 30) + '.png') : 'ai-image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function regenerateImage(index) {
    var history = State.studioHistory || [];
    var img = history[index];
    if (!img) return;
    setPrompt(img.prompt);
    if (img.style) setStyle(img.style);
    if (img.ratio) setRatio(img.ratio);
    if (img.quality) setQuality(img.quality);
    generate();
  }

  function regenerateImageByIndex(index) {
    regenerateImage(index);
  }

  function clearHistory() {
    if (!confirm('确定清除所有生成记录？')) return;
    State.studioHistory.length = 0;
    State.saveToStorage();
    renderHistory();
    UI.showToast('已清除历史记录', 'info');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var now = new Date();
    var diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    return d.getMonth() + 1 + '/' + d.getDate() + ' ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return {
    init: init,
    setPrompt: setPrompt,
    setStyle: setStyle,
    setRatio: setRatio,
    setQuality: setQuality,
    handleUpload: handleUpload,
    removeUpload: removeUpload,
    useExample: useExample,
    generate: generate,
    showDetail: showDetail,
    downloadImage: downloadImage,
    downloadImageByUrl: downloadImageByUrl,
    regenerateImage: regenerateImage,
    regenerateImageByIndex: regenerateImageByIndex,
    clearHistory: clearHistory,
    renderHistory: renderHistory
  };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    if (document.getElementById('studio-view')) {
      Studio.init();
    }
  }, 100);
});

