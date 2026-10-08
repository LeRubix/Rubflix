const { nativeImage } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

// Windows builds an HICON from the window icon, which is unreliable for very
// large source bitmaps, so everything is normalised down to this size.
const WINDOW_ICON_SIZE = 256;

// Sizes embedded into the generated .ico used for desktop/start-menu shortcuts.
const ICO_SIZES = [16, 32, 48, 64, 128, 256];

const SHORTCUT_NAME = 'Rubflix';

function iconFileName(_variant) {
  return 'icon.png';
}

function getIconPath(variant) {
  const name = iconFileName(variant);
  const candidates = [
    path.join(process.resourcesPath ?? '', 'icons', name),
    path.join(__dirname, '..', 'build', name),
    path.join(__dirname, 'icons', name),
  ];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return path.join(__dirname, '..', 'build', name);
}

function loadImage(variant) {
  const iconPath = getIconPath(variant);
  if (!fs.existsSync(iconPath)) return null;

  let image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) {
    image = nativeImage.createFromBuffer(fs.readFileSync(iconPath));
  }
  return image.isEmpty() ? null : image;
}

/** Window/taskbar icon for BrowserWindow#setIcon. */
function loadWindowIcon(variant) {
  const image = loadImage(variant);
  if (!image) return null;

  if (image.getSize().width > WINDOW_ICON_SIZE) {
    const resized = image.resize({
      width: WINDOW_ICON_SIZE,
      height: WINDOW_ICON_SIZE,
      quality: 'best',
    });
    if (!resized.isEmpty()) return resized;
  }
  return image;
}

/** Wrap PNG frames in an ICO container (Vista+ supports PNG-compressed entries). */
function buildIco(image) {
  const frames = [];
  for (const size of ICO_SIZES) {
    const png = image.resize({ width: size, height: size, quality: 'best' }).toPNG();
    if (png && png.length > 0) frames.push({ size, png });
  }
  if (frames.length === 0) return null;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);

  const directory = Buffer.alloc(16 * frames.length);
  let offset = header.length + directory.length;

  frames.forEach((frame, index) => {
    const at = index * 16;
    const dim = frame.size >= 256 ? 0 : frame.size; // 0 means 256 in ICO
    directory.writeUInt8(dim, at);
    directory.writeUInt8(dim, at + 1);
    directory.writeUInt8(0, at + 2); // palette size
    directory.writeUInt8(0, at + 3); // reserved
    directory.writeUInt16LE(1, at + 4); // color planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(frame.png.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += frame.png.length;
  });

  return Buffer.concat([header, directory, ...frames.map((f) => f.png)]);
}

function writeIcoFile(app, variant) {
  const image = loadImage(variant);
  if (!image) return null;

  const ico = buildIco(image);
  if (!ico) return null;

  const dir = path.join(app.getPath('userData'), 'icons');
  fs.mkdirSync(dir, { recursive: true });

  // Distinct filename per variant so Windows does not serve a cached icon.
  const target = path.join(dir, `app-${variant}.ico`);
  fs.writeFileSync(target, ico);
  return target;
}

function shortcutPaths(app) {
  const candidates = [
    path.join(app.getPath('desktop'), `${SHORTCUT_NAME}.lnk`),
  ];
  if (process.env.APPDATA) {
    candidates.push(
      path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', `${SHORTCUT_NAME}.lnk`),
    );
  }
  if (process.env.ProgramData) {
    candidates.push(
      path.join(process.env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', `${SHORTCUT_NAME}.lnk`),
    );
  }
  return candidates.filter((p) => fs.existsSync(p));
}

function runPowerShell(script) {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, timeout: 15000 },
      (err, _stdout, stderr) => {
        if (err) {
          console.error('[icon] shortcut update failed:', stderr || err.message);
          resolve(false);
        } else {
          resolve(true);
        }
      },
    );
  });
}

/**
 * Rewrites the icon of the installed desktop/start-menu shortcuts. This is the
 * only way to change what Windows shows for an installed app, because the
 * taskbar and shortcut icons come from the .lnk / .exe rather than setIcon.
 */
async function updateShortcutIcons(app, variant) {
  if (process.platform !== 'win32' || !app.isPackaged) return false;

  const icoPath = writeIcoFile(app, variant);
  if (!icoPath) return false;

  const shortcuts = shortcutPaths(app);
  if (shortcuts.length === 0) return false;

  const assignments = shortcuts
    .map((lnk) => {
      const escapedLnk = lnk.replace(/'/g, "''");
      const escapedIco = icoPath.replace(/'/g, "''");
      return `$s = $sh.CreateShortcut('${escapedLnk}'); $s.IconLocation = '${escapedIco},0'; $s.Save();`;
    })
    .join(' ');

  const ok = await runPowerShell(
    `$sh = New-Object -ComObject WScript.Shell; ${assignments}`,
  );

  if (ok) {
    // Ask Explorer to drop its cached icons so the change shows immediately.
    await runPowerShell('Start-Process -FilePath ie4uinit.exe -ArgumentList "-show" -WindowStyle Hidden');
  }
  return ok;
}

// Toggling the setting quickly should not spawn overlapping PowerShell calls,
// so runs are serialised and collapsed down to the most recent variant.
let shortcutQueue = Promise.resolve();
let pendingVariant = null;

function queueShortcutUpdate(app, variant) {
  pendingVariant = variant;
  shortcutQueue = shortcutQueue
    .then(() => {
      if (pendingVariant === null) return false;
      const target = pendingVariant;
      pendingVariant = null;
      return updateShortcutIcons(app, target);
    })
    .catch((err) => {
      console.error('[icon] shortcut update failed:', err);
      return false;
    });
  return shortcutQueue;
}

function statePath(app) {
  return path.join(app.getPath('userData'), 'icon-variant.json');
}

function loadVariant(app) {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath(app), 'utf8'));
    if (parsed.variant === 'alternate') return 'alternate';
  } catch {
    // no saved variant yet
  }
  return 'default';
}

function saveVariant(app, variant) {
  try {
    fs.writeFileSync(statePath(app), JSON.stringify({ variant }));
  } catch (err) {
    console.error('[icon] failed to persist variant:', err);
  }
}

function normalizeVariant(variant) {
  return variant === 'alternate' ? 'alternate' : 'default';
}

module.exports = {
  getIconPath,
  loadWindowIcon,
  queueShortcutUpdate,
  loadVariant,
  saveVariant,
  normalizeVariant,
};
