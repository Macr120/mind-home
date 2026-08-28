# Vigia del boton izquierdo global para el modo --fondo: emite por stdout
# "down True|False" (el booleano = el cursor estaba sobre el escritorio) y
# "up x" en cada transicion. Sin hooks de bajo nivel: sondeo de
# GetAsyncKeyState a ~30 Hz, de sobra para un click-to-move -- y la mitad de CPU
# que a 60, que en un proceso de PowerShell encendido todo el dia se nota.
#
# "Sobre el escritorio" = la ventana raiz bajo el cursor es Progman o WorkerW.
# Como la ventana wallpaper es hija de esa capa, un clic sobre ella tambien
# cuenta (su raiz ES Progman/WorkerW); un clic dentro de cualquier otra app, no.
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class Raton {
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vk);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT p);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr h, uint flags);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  public struct POINT { public int X, Y; }
  public static bool SobreEscritorio() {
    POINT p; GetCursorPos(out p);
    IntPtr raiz = GetAncestor(WindowFromPoint(p), 2);
    var sb = new StringBuilder(256); GetClassName(raiz, sb, 256);
    string c = sb.ToString();
    return c == "Progman" || c == "WorkerW";
  }
}
'@

$antes = $false
while ($true) {
  $ahora = ([Raton]::GetAsyncKeyState(0x01) -band 0x8000) -ne 0
  if ($ahora -ne $antes) {
    $antes = $ahora
    if ($ahora) { [Console]::Out.WriteLine('down ' + [Raton]::SobreEscritorio()) }
    else { [Console]::Out.WriteLine('up x') }
    [Console]::Out.Flush()
  }
  Start-Sleep -Milliseconds 33
}
