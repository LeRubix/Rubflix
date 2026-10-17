/**
 * Downloads mpv Windows build (LGPL-2.1) for bundling with Kudflix.
 * Source: https://github.com/shinchiro/mpv-winbuild-cmake/releases
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TARGET_DIR = path.join(__dirname, '..', 'electron', 'bin', 'mpv');
const TEMP_ARCHIVE = path.join(__dirname, '..', 'electron', 'bin', 'mpv-temp.7z');
const GITHUB_API = 'https://api.github.com/repos/shinchiro/mpv-winbuild-cmake/releases/latest';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const request = (currentUrl) => {
      https.get(currentUrl, { headers: { 'User-Agent': 'Kudflix-setup' } }, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          request(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode} for ${currentUrl}`));
          return;
        }
        const chunks = [];
        response.on('data', (c) => chunks.push(c));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    };
    request(url);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (currentUrl) => {
      https.get(currentUrl, { headers: { 'User-Agent': 'Kudflix-setup' } }, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          request(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', reject);
    };
    request(url);
  });
}

function find7z() {
  const candidates = [
    '7z',
    'C:\\Program Files\\7-Zip\\7z.exe',
    'C:\\Program Files (x86)\\7-Zip\\7z.exe',
  ];
  for (const candidate of candidates) {
    try {
      if (candidate === '7z') {
        execFileSync('7z', ['--help'], { stdio: 'ignore' });
        return '7z';
      }
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

function extract7z(archive, dest) {
  const sevenZip = find7z();
  if (sevenZip) {
    try {
      execFileSync(sevenZip, ['x', archive, `-o${dest}`, '-y'], { stdio: 'inherit' });
      return true;
    } catch {
      console.error('\n7-Zip extraction failed, attempting fallback...');
    }
  }

  // Fallback to Windows 10/11 built-in tar.exe which supports .7z via libarchive
  try {
    execFileSync('tar.exe', ['-xf', archive, '-C', dest], { stdio: 'inherit' });
    return true;
  } catch (err) {
    console.error('\nBuilt-in tar extraction failed:', err.message);
  }

  console.error('\n7-Zip is required to extract mpv. Install from https://www.7-zip.org/');
  console.error('Alternatively, manually extract mpv.exe and ffprobe.exe to electron/bin/mpv/\n');
  return false;
}

function findFile(dir, name) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === name.toLowerCase()) return full;
    if (entry.isDirectory()) {
      const found = findFile(full, name);
      if (found) return found;
    }
  }
  return null;
}

async function getLatestMpvUrl() {
  const body = await httpsGet(GITHUB_API);
  const release = JSON.parse(body.toString());
  const asset = release.assets.find((a) =>
    /^mpv-x86_64-v3-.*\.7z$/i.test(a.name) && !a.name.includes('-dev-')
  ) || release.assets.find((a) =>
    /^mpv-dev-x86_64-v3-.*\.7z$/i.test(a.name)
  );

  if (!asset) {
    throw new Error('No mpv Windows x86_64 asset found in latest release');
  }

  return { url: asset.browser_download_url, name: asset.name };
}

async function main() {
  if (fs.existsSync(path.join(TARGET_DIR, 'mpv.exe'))) {
    console.log('mpv already present at', TARGET_DIR);
    return;
  }

  fs.mkdirSync(path.dirname(TARGET_DIR), { recursive: true });
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  const { url, name } = await getLatestMpvUrl();
  console.log('Downloading', name);
  console.log('From', url);

  try {
    await download(url, TEMP_ARCHIVE);
  } catch (err) {
    console.error('Download failed:', err.message);
    console.log('\nManual setup:');
    console.log('1. Download mpv from https://github.com/shinchiro/mpv-winbuild-cmake/releases');
    console.log('2. Extract mpv.exe and ffprobe.exe to electron/bin/mpv/');
    process.exit(1);
  }

  console.log('Extracting...');
  const extractDir = path.join(__dirname, '..', 'electron', 'bin', 'mpv-extract');
  fs.mkdirSync(extractDir, { recursive: true });

  if (!extract7z(TEMP_ARCHIVE, extractDir)) {
    process.exit(1);
  }

  const mpvExe = findFile(extractDir, 'mpv.exe');
  const ffprobeExe = findFile(extractDir, 'ffprobe.exe');

  if (!mpvExe) {
    console.error('mpv.exe not found in archive');
    process.exit(1);
  }

  const mpvDir = path.dirname(mpvExe);
  for (const entry of fs.readdirSync(mpvDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    fs.copyFileSync(path.join(mpvDir, entry.name), path.join(TARGET_DIR, entry.name));
  }

  if (ffprobeExe) {
    fs.copyFileSync(ffprobeExe, path.join(TARGET_DIR, 'ffprobe.exe'));
  }

  fs.rmSync(TEMP_ARCHIVE, { force: true });
  fs.rmSync(extractDir, { recursive: true, force: true });

  fs.writeFileSync(path.join(TARGET_DIR, 'LICENSE.txt'), `mpv is licensed under LGPL-2.1 or later.
Source code: https://github.com/mpv-player/mpv
Windows builds: https://github.com/shinchiro/mpv-winbuild-cmake/releases
`);

  console.log('mpv installed to', TARGET_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
