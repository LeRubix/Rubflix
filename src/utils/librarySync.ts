import type { LocalFile } from '../components/NetflixUI';
import type { Settings } from '../components/SettingsModal';
import { toBasicFile } from './libraryLoader';
import { hydrateFilesFromCache, deleteCachedMedia } from './thumbnailCache';
import { pruneWatchedManual } from './watched';

type ScannedFile = Parameters<typeof toBasicFile>[0];

export interface LibraryDiff {
  added: LocalFile[];
  removedPaths: string[];
  kept: LocalFile[];
}

export async function scanAllFolders(settings: Pick<Settings, 'movieFolders' | 'tvFolders' | 'animeFolders'>) {
  const api = window.electronAPI;
  const animeFolders = settings.animeFolders ?? [];
  const [movieResults, tvResults, animeResults] = await Promise.all([
    Promise.all(settings.movieFolders.map((f) => api.scanDirectory(f))),
    Promise.all(settings.tvFolders.map((f) => api.scanDirectory(f))),
    Promise.all(animeFolders.map((f) => api.scanDirectory(f))),
  ]);

  let basicFiles: LocalFile[] = [
    ...movieResults.flat().map((f) => toBasicFile(f, 'movie')),
    ...tvResults.flat().map((f) => toBasicFile(f, 'tv')),
    ...animeResults.flat().map((f) => toBasicFile(f, 'anime')),
  ];
  basicFiles = await hydrateFilesFromCache(basicFiles);

  const enrichQueue: { file: ScannedFile; category: 'movie' | 'tv' | 'anime' }[] = [
    ...movieResults.flat().map((file) => ({ file, category: 'movie' as const })),
    ...tvResults.flat().map((file) => ({ file, category: 'tv' as const })),
    ...animeResults.flat().map((file) => ({ file, category: 'anime' as const })),
  ];

  return { basicFiles, enrichQueue };
}

export function diffLibrary(prev: LocalFile[], nextBasic: LocalFile[]): LibraryDiff {
  const prevMap = new Map(prev.map((f) => [f.path, f]));
  const nextPaths = new Set(nextBasic.map((f) => f.path));

  const removedPaths = prev.filter((f) => !nextPaths.has(f.path)).map((f) => f.path);
  const added = nextBasic.filter((f) => !prevMap.has(f.path));
  const kept = prev.filter((f) => nextPaths.has(f.path));

  return { added, removedPaths, kept };
}

export function mergeLibrarySync(prev: LocalFile[], added: LocalFile[], removedPaths: string[]): LocalFile[] {
  const removed = new Set(removedPaths);
  return [...prev.filter((f) => !removed.has(f.path)), ...added];
}

/** Remove progress/playcount entries for deleted files across all profiles. */
export function pruneRemovedPaths(removedPaths: string[]) {
  if (removedPaths.length === 0) return;
  const removed = new Set(removedPaths);
  deleteCachedMedia(removedPaths).catch(() => {});

  try {
    const profiles = JSON.parse(localStorage.getItem('netflix_profiles') || '[]') as { id: string }[];
    for (const profile of profiles) {
      const progKey = `netflix_progress_${profile.id}`;
      const countKey = `netflix_playcounts_${profile.id}`;
      for (const key of [progKey, countKey]) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw) as Record<string, number>;
        let changed = false;
        for (const path of removed) {
          if (path in data) {
            delete data[path];
            changed = true;
          }
        }
        if (changed) localStorage.setItem(key, JSON.stringify(data));
      }
      pruneWatchedManual(profile.id, removed);
    }
  } catch {
    // ignore parse errors
  }
}
