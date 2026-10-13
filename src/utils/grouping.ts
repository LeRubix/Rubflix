import type { LocalFile } from '../components/NetflixUI';
import { applyMediaOverride, isTmdbDisabled } from './mediaOverrides';
import { getSeasonGroupKey } from './episodeParsing';
import { parseSeriesFolderName } from './metadata';
import { getCachedForVideo } from './tmdb';

function normPath(p: string): string {
  return p.replace(/\//g, '\\').toLowerCase();
}

const JUNK_GENRES = new Set(['Local Media', 'Movie', 'Series', '']);

export function getSeriesRoot(relativePath?: string): string | null {
  if (!relativePath) return null;
  const parts = relativePath.split('/');
  return parts.length > 1 ? parts[0] : null;
}

function bestThumbnail(episodes: LocalFile[]): string | undefined {
  for (const ep of episodes) {
    if (ep.localFanart) return ep.localFanart;
  }
  for (const ep of episodes) {
    if (ep.localPoster) return ep.localPoster;
  }
  for (const ep of episodes) {
    if (ep.thumbnail) return ep.thumbnail;
  }
  return undefined;
}

export function buildSeriesFolders(shows: LocalFile[]): LocalFile[] {
  const rootFolders = new Map<string, LocalFile[]>();

  shows.forEach((f) => {
    const root = getSeriesRoot(f.relativePath);
    if (!root) return;
    if (!rootFolders.has(root)) rootFolders.set(root, []);
    rootFolders.get(root)!.push(f);
  });

  return Array.from(rootFolders.entries()).map(([root, fList]) => {
    const sorted = [...fList].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    );
    const fanart = sorted.find((ep) => ep.localFanart)?.localFanart ?? null;
    const poster = sorted.find((ep) => ep.localPoster)?.localPoster ?? null;
    const { title: seriesTitle, year: seriesYear } = parseSeriesFolderName(root);
    const folder: LocalFile = {
      name: root,
      path: `folder://${root}`,
      isFolder: true,
      category: 'tv',
      folderFiles: sorted,
      thumbnail: bestThumbnail(sorted),
      localFanart: fanart,
      localPoster: poster,
      meta: {
        title: seriesTitle,
        year: seriesYear,
        description: `A collection of ${sorted.length} video files inside the ${root} folder.`,
      },
      dateModified: Date.now(),
    };
    return applyMediaOverride(folder);
  });
}

export function isInProgress(file: LocalFile, progresses: Record<string, number>): boolean {
  const pos = progresses[file.path];
  if (!pos || pos <= 5) return false;
  if (file.duration && pos >= file.duration - 30) return false;
  return true;
}

export function buildContinueWatchingMovies(
  movies: LocalFile[],
  progresses: Record<string, number>,
): LocalFile[] {
  return movies.filter((f) => isInProgress(f, progresses));
}

export function buildContinueWatchingSeries(
  shows: LocalFile[],
  progresses: Record<string, number>,
  seriesFolders: LocalFile[],
): LocalFile[] {
  const inProgress = shows.filter((f) => isInProgress(f, progresses));
  const byRoot = new Map<string, LocalFile>();

  for (const ep of inProgress) {
    const root = getSeriesRoot(ep.relativePath);
    if (!root) continue;
    const existing = byRoot.get(root);
    const existingPos = existing ? (progresses[existing.path] ?? 0) : -1;
    const epPos = progresses[ep.path] ?? 0;
    if (!existing || epPos > existingPos) {
      byRoot.set(root, ep);
    }
  }

  return Array.from(byRoot.entries()).map(([root, resumeEpisode]) => {
    const folder = seriesFolders.find((f) => f.path === `folder://${root}`);
    if (!folder) {
      return { ...resumeEpisode, resumeEpisode };
    }
    return { ...folder, resumeEpisode };
  });
}

export function buildContinueWatchingAll(
  movies: LocalFile[],
  shows: LocalFile[],
  progresses: Record<string, number>,
  seriesFolders: LocalFile[],
): LocalFile[] {
  const movieItems = buildContinueWatchingMovies(movies, progresses);
  const seriesItems = buildContinueWatchingSeries(shows, progresses, seriesFolders);
  return [...movieItems, ...seriesItems];
}

export function buildTop10(
  movies: LocalFile[],
  shows: LocalFile[],
  playCounts: Record<string, number>,
  seriesFolders: LocalFile[],
): LocalFile[] {
  type Scored = { item: LocalFile; count: number };

  const scored: Scored[] = [];

  for (const movie of movies) {
    const count = playCounts[movie.path] ?? 0;
    if (count > 0) scored.push({ item: movie, count });
  }

  const seriesCounts = new Map<string, number>();
  for (const ep of shows) {
    const root = getSeriesRoot(ep.relativePath);
    if (!root) continue;
    const count = playCounts[ep.path] ?? 0;
    if (count <= 0) continue;
    seriesCounts.set(root, (seriesCounts.get(root) ?? 0) + count);
  }

  for (const [root, count] of seriesCounts) {
    const folder = seriesFolders.find((f) => f.path === `folder://${root}`);
    if (folder) scored.push({ item: folder, count });
  }

  return scored
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((s) => s.item);
}

export function buildSearchCatalog(movies: LocalFile[], seriesFolders: LocalFile[]): LocalFile[] {
  return [...movies, ...seriesFolders];
}

export function buildHeroCatalog(movies: LocalFile[], seriesFolders: LocalFile[]): LocalFile[] {
  return [...movies, ...seriesFolders];
}

/** Episode to play from a series folder card (resume or first). */
export function resolvePlayTarget(video: LocalFile): LocalFile {
  if (video.resumeEpisode) return video.resumeEpisode;
  if (video.isFolder && video.folderFiles?.length) return video.folderFiles[0];
  return video;
}

/** Progress fraction for a card (handles resumeEpisode). */
export function cardProgress(
  video: LocalFile,
  progresses: Record<string, number>,
): number | undefined {
  const src = video.resumeEpisode ?? video;
  const pos = progresses[src.path];
  if (pos === undefined || !src.duration) return undefined;
  return pos / src.duration;
}

export function getItemGenres(item: LocalFile): string[] {
  const seen = new Set<string>();
  const genres: string[] = [];

  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || JUNK_GENRES.has(trimmed) || seen.has(trimmed)) return;
    seen.add(trimmed);
    genres.push(trimmed);
  };

  if (item.meta?.genre) {
    for (const part of item.meta.genre.split(',')) add(part);
  }

  if (!isTmdbDisabled(item)) {
    const cached = getCachedForVideo(item);
    for (const genre of cached?.genres ?? []) add(genre);
  }

  return genres;
}

export function buildGenreRows(
  items: LocalFile[],
  options?: { minItems?: number },
): { title: string; videos: LocalFile[] }[] {
  const minItems = options?.minItems ?? 2;
  const genreMap = new Map<string, LocalFile[]>();

  for (const item of items) {
    for (const genre of getItemGenres(item)) {
      if (!genreMap.has(genre)) genreMap.set(genre, []);
      genreMap.get(genre)!.push(item);
    }
  }

  return Array.from(genreMap.entries())
    .filter(([, videos]) => videos.length >= minItems)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, videos]) => ({ title, videos }));
}

/** Open the series detail modal for an episode, with the season tab that contains it. */
export function resolveShowDetailTarget(
  files: LocalFile[],
  file: LocalFile,
): { show: LocalFile; seasonKey: string } | null {
  if (file.isFolder || file.category !== 'tv') return null;
  const targetKey = normPath(file.path);

  for (const f of files) {
    if (!f.isFolder || !f.folderFiles) continue;
    for (const ep of f.folderFiles) {
      if (normPath(ep.path) === targetKey) {
        return { show: f, seasonKey: getSeasonGroupKey(ep.relativePath) };
      }
    }
  }

  const shows = files.filter((f) => f.category === 'tv' && !f.isFolder);
  const folders = buildSeriesFolders(shows);
  for (const show of folders) {
    for (const ep of show.folderFiles ?? []) {
      if (normPath(ep.path) === targetKey) {
        return { show, seasonKey: getSeasonGroupKey(ep.relativePath) };
      }
    }
  }
  return null;
}
