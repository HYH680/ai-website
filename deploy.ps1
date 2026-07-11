# ====================================
# AI 智能助手 - 一键部署脚本
# 使用前请先安装 Vercel CLI
# ====================================

Write-Host "=== AI 智能助手 部署工具 ===" -ForegroundColor Green
Write-Host ""

# Check prerequisites
$hasVercel = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $hasVercel) {
    Write-Host "[!] 未检测到 Vercel CLI" -ForegroundColor Yellow
    Write-Host "    正在安装..."
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[✗] 安装失败，请手动运行: npm install -g vercel" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[✓] Vercel CLI 已就绪" -ForegroundColor Green

# Login check
$loginStatus = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] 请先登录 Vercel" -ForegroundColor Yellow
    vercel login
}

Write-Host ""
Write-Host "正在部署到 Vercel..." -ForegroundColor Cyan
Write-Host ""
Write-Host "请设置以下环境变量(按回车跳过，部署后在 Vercel 控制台设置):" -ForegroundColor Gray
$apiKey = Read-Host "OPENAI_API_KEY (可选)"
$jwtSecret = Read-Host "JWT_SECRET (可选，将自动生成)"

if (-not $jwtSecret) {
    $jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
}

$envArgs = @()
if ($apiKey) { $envArgs += "--build-env", "OPENAI_API_KEY=$apiKey" }
$envArgs += "--build-env", "JWT_SECRET=$jwtSecret"

Write-Host ""
Write-Host "正在部署..." -ForegroundColor Cyan
vercel --prod $envArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== 部署成功! ===" -ForegroundColor Green
    Write-Host "请在 Vercel 控制台设置以下环境变量:" -ForegroundColor Yellow
    Write-Host "  OPENAI_API_KEY  - OpenAI API 密钥" -ForegroundColor Gray
    Write-Host "  JWT_SECRET      - JWT 签名密钥 (已自动设置)" -ForegroundColor Gray
    Write-Host "  DATABASE_URL    - (可选) Vercel Postgres 连接串" -ForegroundColor Gray
} else {
    Write-Host "[✗] 部署失败，请检查上面的错误信息" -ForegroundColor Red
}
