const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = `
$OutputEncoding = [Console]::OutputEncoding = [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class KudflixWin {
  [DllImport("user32.dll", CharSet=CharSet.Unicode)]
  public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
  [DllImport("user32.dll")]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll", EntryPoint="SetWindowLongPtr")]
  public static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);
  [DllImport("user32.dll", EntryPoint="SetWindowLong")]
  public static extern int SetWindowLong32(IntPtr hWnd, int nIndex, int dwNewLong);

  public static IntPtr FindMpv() {
    IntPtr exact = FindWindow("mpv", "Kudflix Video");
    if (exact != IntPtr.Zero) return exact;
    return FindWindow("mpv", null);
  }

  public static void Own(IntPtr h, IntPtr owner) {
    if (IntPtr.Size == 8) SetWindowLongPtr64(h, -8, owner);
    else SetWindowLong32(h, -8, owner.ToInt32());
  }
}
"@
[Console]::Out.WriteLine('ready')
[Console]::Out.Flush()
while ($true) {
  $line = [Console]::In.ReadLine()
  if ([string]::IsNullOrEmpty($line) -or $line -eq 'quit') { break }
  try {
    $h = [KudflixWin]::FindMpv()
    if ($h -eq [IntPtr]::Zero) { continue }
    if ($line -eq 'hide') { [void][KudflixWin]::ShowWindow($h, 0); continue }
    if ($line -eq 'show') { [void][KudflixWin]::ShowWindow($h, 8); continue }
    if ($line.StartsWith('own,')) {
      [KudflixWin]::Own($h, [IntPtr][Int64]$line.Substring(4))
      continue
    }
    $p = $line.Split(',')
    if ($p.Length -ne 4) { continue }
    # HWND_TOP, SWP_NOACTIVATE | SWP_SHOWWINDOW. Controls are raised after this.
    [void][KudflixWin]::SetWindowPos($h, [IntPtr]::Zero, [int]$p[0], [int]$p[1], [int]$p[2], [int]$p[3], 0x0050)
  } catch {
    [Console]::Error.WriteLine($_.Exception.Message)
  }
}
`;

class MpvWindow {
  constructor() {
    this.ready = false;
    this.closed = false;
    this.queue = [];
    const scriptPath = path.join(os.tmpdir(), 'kudflix-mpv-window.ps1');
    fs.writeFileSync(scriptPath, SCRIPT.trimStart(), 'utf8');
    this.ps = spawn(
      'powershell.exe',
      ['-NoProfile', '-NoLogo', '-STA', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    this.ps.stderr.on('data', (buf) => {
      const text = buf.toString().trim();
      if (text) console.error('[mpv-window]', text);
    });
    this.ps.stdout.on('data', (buf) => {
      if (!this.ready && buf.toString().includes('ready')) {
        this.ready = true;
        for (const line of this.queue) this.send(line);
        this.queue = [];
      }
    });
    this.ps.on('exit', () => {
      this.closed = true;
    });
  }

  send(line) {
    if (this.closed || !this.ps.stdin.writable) return;
    this.ps.stdin.write(`${line}\n`);
  }

  own(hwnd) {
    const line = `own,${hwnd}`;
    if (!this.ready) this.queue.push(line);
    else this.send(line);
  }

  move(bounds) {
    const line = [bounds.x, bounds.y, bounds.width, bounds.height].map((n) => Math.round(n)).join(',');
    if (!this.ready) this.queue.push(line);
    else this.send(line);
  }

  hide() {
    if (!this.ready) this.queue.push('hide');
    else this.send('hide');
  }

  show() {
    if (!this.ready) this.queue.push('show');
    else this.send('show');
  }

  close() {
    this.closed = true;
    try { this.ps.stdin.write('quit\n'); } catch { /* already gone */ }
    setTimeout(() => {
      try { this.ps.kill(); } catch { /* already gone */ }
    }, 300);
  }
}

module.exports = { MpvWindow };
