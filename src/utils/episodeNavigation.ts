import type { LocalFile } from '../components/NetflixUI';
import { buildSeriesFolders } from './grouping';
import { resolveEpisodeNumbers } from './episodeParsing';

function normPath(p: string): string {
  try {
    return decodeURIComponent(p).replace(/\\/g, '/').toLowerCase();
  } catch {
    return p.replace(/\\/g, '/').toLowerCase();
  }
}

export interface AdjacentEpisodes {
  prev: LocalFile | null;
  next: LocalFile | null;
}

/**
 * Finds the previous and next episodes for a given video file.
 * Returns { prev: null, next: null } if the video is standalone or at the bounds.
 */
export function getAdjacentEpisodes(
  allFiles: LocalFile[],
  currentVideo: LocalFile | null,
): AdjacentEpisodes {
  if (!currentVideo || currentVideo.isFolder) {
    return { prev: null, next: null };
  }

  // Standalone movies without explicit episode/part numbers NEVER have next/prev episodes!
  if (currentVideo.category === 'movie') {
    const hasEp = resolveEpisodeNumbers(currentVideo.name, currentVideo.relativePath);
    if (!hasEp) {
      return { prev: null, next: null };
    }
  }

  const targetPath = normPath(currentVideo.path);

  // 1. Check existing folder objects that already contain episodes
  const seriesCandidates = allFiles.filter(
    (f) => f.isFolder && f.folderFiles && f.folderFiles.length > 0,
  );
  for (const series of seriesCandidates) {
    const eps = series.folderFiles!;
    const idx = eps.findIndex((e) => normPath(e.path) === targetPath);
    if (idx !== -1) {
      return {
        prev: idx > 0 ? eps[idx - 1] : null,
        next: idx < eps.length - 1 ? eps[idx + 1] : null,
      };
    }
  }

  // 2. Build series folders for non-folder TV / Anime shows (or files with episode numbers)
  const nonFolderShows = allFiles.filter(
    (f) =>
      !f.isFolder &&
      (f.category === 'tv' ||
        f.category === 'anime' ||
        resolveEpisodeNumbers(f.name, f.relativePath) != null),
  );
  if (nonFolderShows.length > 0) {
    const builtSeries = buildSeriesFolders(nonFolderShows);
    for (const series of builtSeries) {
      const eps = series.folderFiles ?? [];
      const idx = eps.findIndex((e) => normPath(e.path) === targetPath);
      if (idx !== -1) {
        return {
          prev: idx > 0 ? eps[idx - 1] : null,
          next: idx < eps.length - 1 ? eps[idx + 1] : null,
        };
      }
    }
  }

  // 3. Fallback: Sibling files in the same directory (ONLY if they actually have episode numbers!)
  const epInfo = resolveEpisodeNumbers(currentVideo.name, currentVideo.relativePath);
  if (epInfo) {
    const currentDir = currentVideo.path.replace(/[\\/][^\\/]*$/, '');
    const normCurrentDir = normPath(currentDir);

    const siblings = allFiles
      .filter(
        (f) =>
          !f.isFolder &&
          normPath(f.path.replace(/[\\/][^\\/]*$/, '')) === normCurrentDir &&
          resolveEpisodeNumbers(f.name, f.relativePath) != null,
      )
      .sort((a, b) => {
        const epA = resolveEpisodeNumbers(a.name, a.relativePath);
        const epB = resolveEpisodeNumbers(b.name, b.relativePath);
        if (epA && epB) {
          if (epA.season !== epB.season) return epA.season - epB.season;
          if (epA.episode !== epB.episode) return epA.episode - epB.episode;
        } else if (epA && !epB) {
          return -1;
        } else if (!epA && epB) {
          return 1;
        }
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });

    if (siblings.length > 1) {
      const idx = siblings.findIndex((f) => normPath(f.path) === targetPath);
      if (idx !== -1) {
        return {
          prev: idx > 0 ? siblings[idx - 1] : null,
          next: idx < siblings.length - 1 ? siblings[idx + 1] : null,
        };
      }
    }
  }

  return { prev: null, next: null };
}
