# ✅ 部署上线检查清单

## 部署前（本地）

- [ ] 代码已提交到 Git
- [ ] 已配置 `vercel.json`
- [ ] 已配置 `package.json`（依赖完整）
- [ ] 静态文件路径正确（`assets/`, `vendor/`）
- [ ] API 路径前后端匹配

## 部署中（Vercel）

- [ ] 运行 `npm install -g vercel && vercel login`
- [ ] 运行 `vercel --prod`
- [ ] 在 Vercel 控制台设置以下环境变量：

### 必填环境变量

| 变量名 | 说明 | 获取方式 |
|--------|------|---------|
| OPENAI_API_KEY | OpenAI 或兼容 API 的密钥 | https://platform.openai.com/api-keys |
| JWT_SECRET | JWT 签名密钥（32 位随机字符串） | 运行 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### 可选但推荐

| 变量名 | 说明 | 获取方式 |
|--------|------|---------|
| DATABASE_URL | Vercel Postgres 连接串 | Vercel → Storage → Create Database → Postgres |
| OPENAI_BASE_URL | 自定义 API 地址（如国内代理） | 默认 https://api.openai.com/v1 |
| SITE_NAME | 站点名称 | 默认 "AI 智能助手" |
| SITE_URL | 站点域名 | 你的 Vercel 域名或自定义域名 |

## 部署后（上线）

- [ ] 访问网站，确认首页正常加载
- [ ] 测试注册流程
- [ ] 测试登录流程
- [ ] 测试对话功能（mock 模式可用）
- [ ] 测试生图功能
- [ ] 测试支付弹窗
- [ ] 测试签到功能
- [ ] 测试移动端响应式
- [ ] 绑定自定义域名
- [ ] 配置 HTTPS（Vercel 自动）
- [ ] 提交到百度搜索资源平台
- [ ] 提交到 Google Search Console
- [ ] 安装百度统计 / GA4

## 内容上线

- [ ] 注册社交媒体账号
- [ ] 发布第一篇小红书
- [ ] 发布第一条抖音
- [ ] 回答知乎问题
- [ ] 通知身边朋友体验
