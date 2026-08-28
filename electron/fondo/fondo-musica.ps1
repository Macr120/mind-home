# Que suena en el sistema, para el panel de musica del modo --fondo. Windows no
# tiene nada equivalente al AppleScript de macOS: lo que hay es el SMTC (System
# Media Transport Controls), el mismo sitio del que sale el popup de volumen con
# la caratula. Lo alimenta CUALQUIER app que se anuncie ahi -- Spotify, el
# reproductor de Windows, un video de YouTube en Edge o Chrome --, asi que no
# hay que preguntarle a cada una por separado como en el Mac.
#
# Persistente y no una consulta por vez, como el vigia del raton: arrancar
# PowerShell cuesta cientos de milisegundos y el panel refresca cada pocos
# segundos. Emite por stdout "artista|titulo" en cada cambio, o una linea vacia
# cuando no suena nada, y el shell se queda con lo ultimo que dijo.
#
# Ojo con los tipos WinRT desde PowerShell 5.1: hay que nombrarlos con su
# ContentType y envolver a mano cada IAsyncOperation en una Task, que es lo que
# hace Esperar(). Sin el Wait con tope, una app que no responde colgaria el
# bucle entero.
# La salida va en UTF-8 a mano: por defecto PowerShell escribe en la pagina de
# codigos de la consola y un nombre con tilde llegaria roto al panel.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Esperar($tarea, $tipo) {
  $m = $asTask.MakeGenericMethod($tipo)
  $t = $m.Invoke($null, @($tarea))
  if (-not $t.Wait(4000)) { return $null }
  $t.Result
}

$TipoMgr = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
$TipoProps = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType=WindowsRuntime]

$mgr = Esperar ($TipoMgr::RequestAsync()) ($TipoMgr)
if (-not $mgr) { exit }

$anterior = $null
while ($true) {
  $linea = ''
  try {
    $s = $mgr.GetCurrentSession()
    # Solo lo que esta SONANDO: en pausa el panel no tiene nada que contar, y
    # una sesion pausada se queda registrada durante horas.
    if ($s -and $s.GetPlaybackInfo().PlaybackStatus -eq 'Playing') {
      $p = Esperar ($s.TryGetMediaPropertiesAsync()) ($TipoProps)
      if ($p -and $p.Title) {
        $titulo = ($p.Title -replace '[\r\n|]', ' ').Trim()
        $artista = ($p.Artist -replace '[\r\n|]', ' ').Trim()
        $linea = "$artista|$titulo"
      }
    }
  } catch {
    # Una app que se cierra a media consulta no vale un panel roto: se emite
    # vacio y en la vuelta siguiente ya estara el estado bueno.
    $linea = ''
  }
  if ($linea -ne $anterior) {
    $anterior = $linea
    [Console]::Out.WriteLine($linea)
    [Console]::Out.Flush()
  }
  Start-Sleep -Seconds 3
}
