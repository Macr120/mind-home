# Guarda la clave del TURN de Cloudflare como secretos de Supabase (función voz-turn).
# Pide los dos valores sin mostrarlos en pantalla ni dejarlos en el historial.
Set-Location (Join-Path $PSScriptRoot '..')
$id = Read-Host 'Pega el Turn Token ID y pulsa Enter'
$tok = Read-Host 'Pega el API Token y pulsa Enter' -AsSecureString
$plano = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($tok))
npx supabase secrets set "CF_TURN_KEY_ID=$($id.Trim())" "CF_TURN_API_TOKEN=$($plano.Trim())"
$plano = $null
if ($LASTEXITCODE -eq 0) { Write-Host 'Listo: secretos guardados.' -ForegroundColor Green } else { Write-Host 'Falló: revisa el mensaje de arriba.' -ForegroundColor Red }
