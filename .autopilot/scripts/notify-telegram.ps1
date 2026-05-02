param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Text
)

$envFile = Join-Path $PSScriptRoot "..\..\.env.local"

if (-not (Test-Path $envFile)) {
    Write-Error "ENV-Datei nicht gefunden: $envFile"
    exit 1
}

$token = (Get-Content $envFile | Select-String "^TELEGRAM_BOT_TOKEN=").Line.Split("=", 2)[1]
$chat = (Get-Content $envFile | Select-String "^TELEGRAM_CHAT_ID=").Line.Split("=", 2)[1]

if (-not $token -or -not $chat) {
    Write-Error "TELEGRAM_BOT_TOKEN oder TELEGRAM_CHAT_ID fehlt in .env.local"
    exit 1
}

try {
    Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" -Method Post -Body @{
        chat_id = $chat
        text = $Text
        parse_mode = "Markdown"
    } | Out-Null
    Write-Host "Telegram-Push gesendet" -ForegroundColor Green
}
catch {
    Write-Error "Telegram-Push fehlgeschlagen: $_"
    exit 1
}
