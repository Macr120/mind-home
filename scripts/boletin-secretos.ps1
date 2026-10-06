# Secretos del boletín diario (docs/BACKEND.md §12): la clave de Resend y el
# secreto con el que el cron llama a `boletin-diario`. Ninguno se muestra en
# pantalla. Sirve también para rotarlos: volver a correrlo los reemplaza.
#
#   powershell -ExecutionPolicy Bypass -File scripts\boletin-secretos.ps1

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot)

$seg = Read-Host 'Pega la clave de Resend (empieza por re_)' -AsSecureString
$clave = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seg))
if (-not $clave.StartsWith('re_')) { throw 'Eso no parece una clave de Resend.' }

# Secreto del cron: 32 bytes aleatorios en hex.
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$auth = -join ($bytes | ForEach-Object { $_.ToString('x2') })

# Por archivo y no por argumento, para que no quede en la lista de procesos.
$tmp = New-TemporaryFile
try {
  Set-Content -Path $tmp -Encoding ascii -Value "RESEND_API_KEY=$clave`nBOLETIN_AUTH=$auth"
  npx supabase secrets set --env-file $tmp
  if ($LASTEXITCODE -ne 0) { throw 'No se pudieron guardar los secretos.' }
} finally {
  Remove-Item $tmp -Force
}

# El mismo secreto en Vault, de donde lo lee el cron.
$sql = "do `$`$ begin " +
  "if exists (select 1 from vault.secrets where name = 'boletin_auth') then " +
  "perform vault.update_secret((select id from vault.secrets where name = 'boletin_auth'), '$auth'); " +
  "else perform vault.create_secret('$auth', 'boletin_auth'); end if; end `$`$;"
npx supabase db query --linked $sql | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'No se pudo guardar boletin_auth en Vault.' }

Write-Host 'Listo: RESEND_API_KEY, BOLETIN_AUTH y boletin_auth guardados.'
