import type { LocalFile } from '../components/NetflixUI';
import { applyMediaOverride } from './mediaOverrides';
import { resolveFileMeta } from './metadata';
import { generateVideoThumbnail } from './thumbnail';
import { runWithConcurrency } from './concurrency';
import { getCachedDuration, setCachedDuration } from './mediaCache';
import { isEnrichCancelled } from './enrichCancel';

const ENRICH_CONCURRENCY = 6;
const TV_ENRICH_SCAN_CAP = 200;

type ScannedFile = {
  name: string;
  path: string;
  relativePath?: string;
  folderName?: string;
  localPoster?: string | null;
  localFanart?: string | null;
  localNfoContent?: string | null;
  mtimeMs?: number;
};

function needsEnrich(f: LocalFile | undefined): boolean {
  return !f?.thumbnail || !(f.duration && f.duration > 0);
}

async function probeDuration(videoPath: string): Promise<number> {
  if (isEnrichCancelled(videoPath)) return 0;

  const cached = getCachedDuration(videoPath);
  if (cached && cached > 0) return cached;

  if (window.electronAPI?.probeMediaDuration) {
    try {
      const seconds = await window.electronAPI.probeMediaDuration(videoPath);
      if (seconds && seconds > 0) {
        setCachedDuration(videoPath, seconds);
        return seconds;
      }
    } catch {
      // fall through to thumbnail probe
    }
  }

  return 0;
}

export function toBasicFile(file: ScannedFile, category: 'movie' | 'tv' | 'anime'): LocalFile {
  const cachedDuration = getCachedDuration(file.path) ?? 0;
  return applyMediaOverride({
    ...file,
    meta: resolveFileMeta(file, category),
    thumbnail: file.localFanart || file.localPoster || undefined,
    duration: cachedDuration,
    dateModified: file.mtimeMs ?? Date.now(),
    category,
  });
}

/** Movies: all files. TV / Anime: all episodes needing enrich (capped) + priority paths. */
export function buildOptimizedEnrichQueue(
  items: { file: ScannedFile; category: 'movie' | 'tv' | 'anime' }[],
  priorityPaths: Set<string> = new Set(),
  hydratedFiles: LocalFile[] = [],
) {
  const hydrated = new Map(hydratedFiles.map((f) => [f.path, f]));

  const movies = items.filter((i) => i.category === 'movie' && needsEnrich(hydrated.get(i.file.path)));
  const seriesPriority = items.filter(
    (i) => i.category !== 'movie' && priorityPaths.has(i.file.path) && needsEnrich(hydrated.get(i.file.path)),
  );

  const seriesAll = items.filter(
    (i) => i.category !== 'movie' && !priorityPaths.has(i.file.path) && needsEnrich(hydrated.get(i.file.path)),
  );

  const seen = new Set<string>();
  const result: typeof items = [];
  for (const item of [...movies, ...seriesPriority, ...seriesAll.slice(0, TV_ENRICH_SCAN_CAP)]) {
    if (seen.has(item.file.path)) continue;
    seen.add(item.file.path);
    result.push(item);
  }
  return result;
}

async function enrichOne(file: ScannedFile, category: 'movie' | 'tv' | 'anime'): Promise<LocalFile | null> {
  if (isEnrichCancelled(file.path)) return null;

  const meta = resolveFileMeta(file, category);
  let thumbnail = file.localFanart || file.localPoster || meta.poster || undefined;
  const skipThumbnail = !!(file.localPoster || file.localFanart);

  let duration = await probeDuration(file.path);
  if (isEnrichCancelled(file.path)) return null;

  const generated = await generateVideoThumbnail(file.path, skipThumbnail, file.mtimeMs);
  if (isEnrichCancelled(file.path)) return null;
  if (!thumbnail && generated.thumbnail) {
    thumbnail = generated.thumbnail;
  }
  if (duration <= 0 && generated.duration > 0) {
    duration = generated.duration;
  }

  return applyMediaOverride({
    ...file,
    meta,
    thumbnail,
    duration: duration > 0 ? duration : 0,
    dateModified: file.mtimeMs ?? Date.now(),
    category,
  });
}

function toScannedFile(file: LocalFile): ScannedFile {
  return {
    name: file.name,
    path: file.path,
    relativePath: file.relativePath,
    folderName: file.folderName,
    localPoster: file.localPoster,
    localFanart: file.localFanart,
    localNfoContent: file.localNfoContent,
    mtimeMs: file.dateModified,
  };
}

/** Fill in durations/thumbnails in the background without blocking the UI. */
export async function enrichLibraryInBackground(
  items: { file: ScannedFile; category: 'movie' | 'tv' | 'anime' }[],
  onBatch: (enriched: LocalFile[]) => void,
): Promise<void> {
  const batch: LocalFile[] = [];
  let batchTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (batch.length === 0) return;
    onBatch([...batch]);
    batch.length = 0;
  };

  const queueUpdate = (entry: LocalFile) => {
    batch.push(entry);
    if (batchTimer) clearTimeout(batchTimer);
    batchTimer = setTimeout(() => {
      flush();
      batchTimer = null;
    }, 120);
  };

  await runWithConcurrency(items, ENRICH_CONCURRENCY, async (item) => {
    const enriched = await enrichOne(item.file, item.category);
    if (enriched) queueUpdate(enriched);
  });

  if (batchTimer) clearTimeout(batchTimer);
  flush();
}

/** Enrich a batch of episode files (e.g. when a series modal opens). */
export async function enrichEpisodesBatch(
  episodes: LocalFile[],
  onBatch: (enriched: LocalFile[]) => void,
): Promise<void> {
  const toEnrich = episodes.filter((ep) => needsEnrich(ep));
  if (toEnrich.length === 0) return;

  const batch: LocalFile[] = [];
  await runWithConcurrency(toEnrich, ENRICH_CONCURRENCY, async (ep) => {
    const enriched = await enrichOne(toScannedFile(ep), 'tv');
    if (enriched) batch.push(enriched);
  });

  if (batch.length > 0) onBatch(batch);
}

export function mergeEnrichedFiles(prev: LocalFile[], enriched: LocalFile[]): LocalFile[] {
  if (enriched.length === 0) return prev;
  const updates = new Map(enriched.map((f) => [f.path, f]));
  return prev.map((f) => updates.get(f.path) ?? f);
}
