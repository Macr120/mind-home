# -X -Y -W -H (opcionales, en coordenadas del escritorio virtual): el trozo que
# debe ocupar la ventana. Sin ellos se estira sobre el WorkerW entero, que es lo
# que se quiere cuando el fondo va en TODAS las pantallas.
param([long]$Hwnd, [int]$X = 0, [int]$Y = 0, [int]$W = 0, [int]$H = 0)

# Cuelga la ventana de la app en la capa del fondo del escritorio, DETRAS de
# los iconos (modo --fondo del shell). Toda la logica Win32 va en C#: los
# string $null de PowerShell llegan como "" a los P/Invoke y rompen
# FindWindow/FindWindowEx.
#
# Dos epocas de Windows:
#  - Clasico (hasta 23H2): el mensaje 0x052C a Progman crea un WorkerW
#    top-level a pantalla completa detras de los iconos; la app se cuelga ahi.
#  - 24H2/25H2 (build >= 26100, verificado en 26200): ese WorkerW ya no existe;
#    el del wallpaper es HIJO de Progman. Si tampoco esta, se cuelga de Progman
#    mismo y HWND_BOTTOM la deja detras de SHELLDLL_DefView (los iconos).
#
# El tamano final lo mide ESTE proceso (GetClientRect del objetivo): los
# calculos de DPI de Electron vienen de otra escala y dejaban la ventana a
# media altura. Ojo: la ventana debe ser resizable (con resizable:false,
# Electron clava el tamano via WM_GETMINMAXINFO y el ajuste se ignora).
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class Fondo {
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindow(string c, string n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindowEx(IntPtr p, IntPtr a, string c, string n);
  [DllImport("user32.dll")] public static extern IntPtr SendMessageTimeout(IntPtr h, uint m, IntPtr w, IntPtr l, uint f, uint t, out IntPtr r);
  [DllImport("user32.dll")] public static extern IntPtr SetParent(IntPtr c, IntPtr p);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr h, uint flags);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int hh, uint f);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  public struct RECT { public int L, T, R, B; }

  public static string Clase(IntPtr h) { var sb = new StringBuilder(256); GetClassName(h, sb, 256); return sb.ToString(); }

  public static string Colgar(IntPtr app, int px, int py, int pw, int ph) {
    IntPtr progman = FindWindow("Progman", null);
    IntPtr r;
    SendMessageTimeout(progman, 0x052C, (IntPtr)0xD, (IntPtr)0x1, 0, 1000, out r);

    // Clasico: WorkerW top-level A PANTALLA COMPLETA y sin iconos dentro (los
    // WorkerW de bandeja miden ~129x36 y colgarse ahi pierde la ventana).
    IntPtr clasico = IntPtr.Zero;
    EnumWindows(delegate(IntPtr top, IntPtr l) {
      if (Clase(top) != "WorkerW") return true;
      if (FindWindowEx(top, IntPtr.Zero, "SHELLDLL_DefView", null) != IntPtr.Zero) return true;
      RECT rc; GetWindowRect(top, out rc);
      if (rc.R - rc.L >= 800 && rc.B - rc.T >= 600) clasico = top;
      return true;
    }, IntPtr.Zero);

    IntPtr hijoProgman = FindWindowEx(progman, IntPtr.Zero, "WorkerW", null);
    IntPtr objetivo; string via;
    if (clasico != IntPtr.Zero) { objetivo = clasico; via = "workerw-clasico"; }
    else if (hijoProgman != IntPtr.Zero) { objetivo = hijoProgman; via = "workerw-hijo-de-progman"; }
    else { objetivo = progman; via = "progman-directo"; }

    SetParent(app, objetivo);
    int x = px, y = py, w = pw, h = ph;
    if (w <= 0 || h <= 0) {
      RECT cli; GetClientRect(objetivo, out cli);
      x = 0; y = 0; w = cli.R; h = cli.B;
      if (w < 400 || h < 300) { RECT rw; GetWindowRect(objetivo, out rw); w = rw.R - rw.L; h = rw.B - rw.T; }
    }
    // HWND_BOTTOM + SWP_NOACTIVATE|SWP_SHOWWINDOW: al fondo del Z-order del
    // padre y visible (la ventana nace oculta; la revela este ajuste).
    SetWindowPos(app, (IntPtr)1, x, y, w, h, 0x0050);

    IntPtr padre = GetAncestor(app, 1);
    return "via=" + via + " padre=" + padre + "(" + Clase(padre) + ") " + w + "x" + h + " en " + x + "," + y;
  }
}
'@

Write-Output ([Fondo]::Colgar([IntPtr]$Hwnd, $X, $Y, $W, $H))
