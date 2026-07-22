# ==============================================================
# Site Solutions - Servidor HTTP Local para Desarrollo (PowerShell)
# Sirve la aplicación web en http://localhost:3000
# ==============================================================

$port = 3000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "🚀 Servidor de desarrollo Site Solutions ejecutándose en http://localhost:$port" -ForegroundColor Green
Write-Host "Presiona Ctrl+C para detener el servidor." -ForegroundColor Yellow

$publicDir = Join-Path $PSScriptRoot "public"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $urlPath = $request.Url.AbsolutePath
        Write-Host "[HTTP] Request: $urlPath" -ForegroundColor Cyan

        # Muestreo de Endpoints API
        if ($urlPath -eq "/api/health") {
            $json = '{"status":"online","app":"Site Solutions Tech Catalog Portal","supabaseConnected":false,"mode":"In-Memory Fallback DB","timestamp":"' + (Get-Date -Format s) + '"}'
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            continue
        }

        if ($urlPath -eq "/api/products") {
            $jsonPath = Join-Path $PSScriptRoot "public\mock_data.json"
            if (Test-Path $jsonPath) {
                $json = Get-Content $jsonPath -Raw
            } else {
                $json = '{"success":true,"products":[]}'
            }
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            continue
        }

        # Sirve archivos estáticos (index.html, css, js, png)
        if ($urlPath -eq "/") { $urlPath = "/index.html" }
        $filePath = Join-Path $publicDir ($urlPath.TrimStart('/').Replace('/', '\'))

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".png"  { $response.ContentType = "image/png" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".json" { $response.ContentType = "application/json; charset=utf-8" }
                Default { $response.ContentType = "application/octet-stream" }
            }

            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errMsg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($errMsg, 0, $errMsg.Length)
        }

        $response.Close()
    } catch {
        Write-Host "Error procesando petición: $_" -ForegroundColor Red
    }
}
