// Calex para Windows: abre https://calex.federicoreta773.workers.dev como una aplicación (sin barra del navegador)
// usando el Microsoft Edge (o Chrome) que ya tienes. Guarda su propio perfil en %LOCALAPPDATA%\Calex, así la sesión y los permisos (micrófono) se mantienen.
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
[assembly: AssemblyTitle("Calex")]
[assembly: AssemblyProduct("Calex")]
[assembly: AssemblyVersion("1.5.0.0")]
[assembly: AssemblyFileVersion("1.5.0.0")]

static class Calex
{
  const string Home = "https://calex.federicoreta773.workers.dev"; // «Calex.exe --voz» abre directo el modo de voz (sin cámara)

  static string Url = Home;

  [STAThread]
  static int Main(string[] args)
  {
    foreach (string a in args) if (a == "--voz") Url = Home + "/?assist=1";
    string pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
    string[] candidatos = {
      Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"), Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"),
      Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"), Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe"), Path.Combine(local, @"Google\Chrome\Application\chrome.exe") };
    string exe = null; foreach (string c in candidatos) if (File.Exists(c)) { exe = c; break; }
    try
    {
      if (exe == null) { Process.Start(new ProcessStartInfo(Url) { UseShellExecute = true }); return 0; } // sin Edge ni Chrome: navegador predeterminado
      string perfil = Path.Combine(local, "Calex", "perfil"); Directory.CreateDirectory(perfil);
      ProcessStartInfo psi = new ProcessStartInfo(exe, "--app=" + Url + " --user-data-dir=\"" + perfil + "\" --window-size=1180,820 --no-first-run --no-default-browser-check");
      psi.UseShellExecute = false; Process.Start(psi); return 0;
    }
    catch (Exception e) { MessageBox.Show("No se pudo abrir Calex: " + e.Message + "\nAbre " + Url + " en tu navegador.", "Calex"); return 1; }
  }
}
