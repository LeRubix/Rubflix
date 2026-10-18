const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { app } = require('electron');

const SUBTITLE_EXTENSIONS = ['.srt', '.vtt', '.ass', '.ssa', '.sub'];

function getFfprobePath() {
  const candidates = [];

  if (app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, 'mpv', 'ffprobe.exe'));
  } else {
    candidates.push(path.join(__dirname, 'bin', 'mpv', 'ffprobe.exe'));
  }

  candidates.push('ffprobe');
  if (process.platform === 'win32') {
    candidates.push('C:\\ffmpeg\\bin\\ffprobe.exe');
  }

  for (const candidate of candidates) {
    if (candidate === 'ffprobe' || candidate.includes('ffmpeg')) return candidate;
    if (fs.existsSync(candidate)) return candidate;
  }

  return 'ffprobe';
}

function runFfprobe(args) {
  const ffprobe = getFfprobePath();
  const options = { timeout: 12000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 };
  const shell = ffprobe === 'ffprobe';

  return new Promise((resolve) => {
    execFile(ffprobe, args, { ...options, shell }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout || '');
    });
  });
}

async function probeMediaDuration(videoPath) {
  if (!videoPath || typeof videoPath !== 'string' || videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
    return null;
  }
  const stdout = await runFfprobe([
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    videoPath,
  ]);

  const seconds = parseFloat((stdout || '').trim());
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds;
}

async function probeMediaAudio(videoPath) {
  if (!videoPath || typeof videoPath !== 'string' || videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
    return { audioCodec: null, hasAudio: true };
  }
  const stdout = await runFfprobe([
    '-v', 'error',
    '-select_streams', 'a:0',
    '-show_entries', 'stream=codec_name',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    videoPath,
  ]);

  const codec = (stdout || '').trim().toLowerCase();
  return { audioCodec: codec || null, hasAudio: codec ? true : null };
}

async function probeTracks(videoPath) {
  if (!videoPath || typeof videoPath !== 'string' || videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
    return { audio: [], subtitles: [] };
  }
  const stdout = await runFfprobe([
    '-v', 'error',
    '-show_entries', 'stream=index,codec_type,codec_name:stream_tags=language,title',
    '-of', 'json',
    videoPath,
  ]);

  if (!stdout) {
    return { audio: [], subtitles: [] };
  }

  try {
    const data = JSON.parse(stdout);
    const streams = data.streams || [];

    const audio = streams
      .filter((s) => s.codec_type === 'audio')
      .map((s, i) => ({
        index: s.index,
        mpvId: i + 1,
        codec: s.codec_name || 'unknown',
        language: s.tags?.language || '',
        title: s.tags?.title || '',
        label: formatTrackLabel('audio', s, i),
      }));

    const subtitles = streams
      .filter((s) => s.codec_type === 'subtitle')
      .map((s, i) => ({
        index: s.index,
        mpvId: i + 1,
        codec: s.codec_name || 'unknown',
        language: s.tags?.language || '',
        title: s.tags?.title || '',
        label: formatTrackLabel('subtitle', s, i),
        embedded: true,
      }));

    return { audio, subtitles };
  } catch {
    return { audio: [], subtitles: [] };
  }
}

function formatTrackLabel(type, stream, order) {
  const lang = stream.tags?.language || '';
  const title = stream.tags?.title || '';
  const codec = (stream.codec_name || '').toUpperCase();

  const parts = [];
  if (lang) parts.push(lang.toUpperCase());
  if (title) parts.push(title);
  if (codec) parts.push(codec);
  if (parts.length === 0) {
    return type === 'audio' ? `Audio ${order + 1}` : `Subtitle ${order + 1}`;
  }
  return parts.join(' · ');
}

function findSubtitleFiles(videoPath) {
  if (!videoPath || typeof videoPath !== 'string' || videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
    return [];
  }
  const dir = path.dirname(videoPath);
  const base = path.basename(videoPath, path.extname(videoPath));

  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir);
  const matches = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!SUBTITLE_EXTENSIONS.includes(ext)) continue;

    const fileBase = path.basename(file, ext);
    const normalizedBase = fileBase.toLowerCase();
    const normalizedVideo = base.toLowerCase();

    // Exact match: movie.srt for movie.mkv
    // Language suffix: movie.en.srt, movie.eng.srt
    if (
      normalizedBase === normalizedVideo ||
      normalizedBase.startsWith(normalizedVideo + '.') ||
      normalizedBase.startsWith(normalizedVideo + '_')
    ) {
      const fullPath = path.join(dir, file);
      const langMatch = fileBase.slice(base.length).replace(/^[\._-]+/, '');
      matches.push({
        path: fullPath,
        name: file,
        language: langMatch || '',
        embedded: false,
        label: langMatch ? `${langMatch} (${ext.slice(1).toUpperCase()})` : path.basename(file),
      });
    }
  }

  // Prefer English, then alphabetical
  matches.sort((a, b) => {
    const aEn = /^(en|eng|english)/i.test(a.language) ? 0 : 1;
    const bEn = /^(en|eng|english)/i.test(b.language) ? 0 : 1;
    if (aEn !== bEn) return aEn - bEn;
    return a.name.localeCompare(b.name);
  });

  return matches;
}

module.exports = {
  probeMediaAudio,
  probeMediaDuration,
  probeTracks,
  findSubtitleFiles,
  SUBTITLE_EXTENSIONS,
};
