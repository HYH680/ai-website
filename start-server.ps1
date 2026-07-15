# ===== www.fjrxb.beauty 本地开发服务器 =====
# 使用纯 PowerShell 启动，无需任何外部依赖

$Port = 8080
$Root = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

# 尝试也监听局域网
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback|Virtual|Bluetooth" -and $_.PrefixOrigin -eq "Dhcp" }).IPAddress
if ($ip) {
    $listener.Prefixes.Add("http://$($ip):$Port/")
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".ico"  = "image/x-icon"
    ".svg"  = "image/svg+xml"
    ".webp" = "image/webp"
    ".woff" = "font/woff"
    ".woff2" = "font/woff2"
    ".ttf"  = "font/ttf"
    ".pdf"  = "application/pdf"
}

$listener.Start()

Write-Host ""
Write-Host "╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🌐 www.fjrxb.beauty - 本地服务器      ║" -ForegroundColor Cyan
Write-Host "╠═══════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║                                           ║" -ForegroundColor Cyan
Write-Host "║  本地:  http://localhost:$Port              ║" -ForegroundColor Green
if ($ip) {
    $ipStr = "http://$($ip):$Port"
    $padding = " " * (44 - $ipStr.Length)
    Write-Host "║  网络:  $ipStr$padding║" -ForegroundColor Green
}
Write-Host "║                                           ║" -ForegroundColor Cyan
Write-Host "║  按 Ctrl+C 停止服务器                      ║" -ForegroundColor Yellow
Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $urlPath = $request.Url.AbsolutePath
    if ($urlPath -eq "/") { $urlPath = "/index.html" }

    $filePath = [System.IO.Path]::Combine($Root, $urlPath.TrimStart("/"))

    if ([System.IO.File]::Exists($filePath)) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

        $content = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentType = $contentType
        $response.ContentLength64 = $content.Length
        $response.OutputStream.Write($content, 0, $content.Length)

        $shortPath = $urlPath -replace "^/", ""
        Write-Host "  ✓ $shortPath" -ForegroundColor Green
    } else {
        $response.StatusCode = 404
        $errorMsg = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 - 文件未找到</h1><p>$urlPath</p>")
        $response.ContentType = "text/html; charset=utf-8"
        $response.ContentLength64 = $errorMsg.Length
        $response.OutputStream.Write($errorMsg, 0, $errorMsg.Length)
        Write-Host "  ✗ $urlPath (404)" -ForegroundColor Red
    }

    $response.Close()
}

$listener.Stop()