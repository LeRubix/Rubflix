import type { LocalFile } from '../components/NetflixUI';
import { getItemGenres } from './grouping';
import { getCachedForVideo } from './tmdb';
import {
  isWatched,
  isSeriesWatched,
  hasUnwatchedEpisode,
  isPartiallyWatched,
} from './watched';

export type WatchedFilter = 'all' | 'unwatched' | 'watched' | 'partial';
export type MediaTypeFilter = 'all' | 'movie' | 'tv';

export const LENGTH_SLIDER_MAX = 240;
export const LENGTH_SLIDER_STEP = 5;

export interface CatalogFilters {
  watched: WatchedFilter;
  mediaType: MediaTypeFilter;
  genres: string[];
  lengthMin: number;
  lengthMax: number;
  decade: string;
  customYear: string;
  director: string;
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  watched: 'all',
  mediaType: 'all',
  genres: [],
  lengthMin: 0,
  lengthMax: LENGTH_SLIDER_MAX,
  decade: 'any',
  customYear: '',
  director: '',
};

export function countActiveFilters(filters: CatalogFilters): number {
  let n = 0;
  if (filters.watched !== 'all') n++;
  if (filters.mediaType !== 'all') n++;
  if (filters.genres.length > 0) n++;
  if (filters.lengthMin > 0 || filters.lengthMax < LENGTH_SLIDER_MAX) n++;
  if (filters.decade !== 'any' || filters.customYear.trim()) n++;
  if (filters.director.trim()) n++;
  return n;
}

export function collectGenres(items: LocalFile[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const g of getItemGenres(item)) {
      set.add(g);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function getItemSearchGenres(item: LocalFile): string[] {
  return getItemGenres(item);
}

export function matchesGenre(item: LocalFile, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const itemGenres = getItemGenres(item);
  return selected.some((s) => itemGenres.includes(s));
}

/** Average episode length in seconds for series; total runtime for movies. */
export function getItemFilterDuration(item: LocalFile): number {
  if (item.isFolder && item.folderFiles?.length) {
    const withDuration = item.folderFiles.filter((ep) => ep.duration && ep.duration > 0);
    if (withDuration.length === 0) return 0;
    const total = withDuration.reduce((sum, ep) => sum + (ep.duration ?? 0), 0);
    return total / withDuration.length;
  }
  return item.duration ?? 0;
}

export function matchesLengthRange(item: LocalFile, minMinutes: number, maxMinutes: number): boolean {
  if (minMinutes <= 0 && maxMinutes >= LENGTH_SLIDER_MAX) return true;
  const seconds = getItemFilterDuration(item);
  if (seconds <= 0) return false;
  const minutes = seconds / 60;
  if (minMinutes > 0 && minutes < minMinutes) return false;
  if (maxMinutes < LENGTH_SLIDER_MAX && minutes > maxMinutes) return false;
  return true;
}

function getItemYear(item: LocalFile): number | null {
  const y = item.meta?.year;
  if (!y) return null;
  const parsed = parseInt(y, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function matchesDirectorFilter(item: LocalFile, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const cached = getCachedForVideo(item);
  if (cached?.director?.toLowerCase().includes(q)) return true;
  if (cached?.cast?.some((name) => name.toLowerCase().includes(q))) return true;
  return false;
}

export function matchesYearFilter(item: LocalFile, decade: string, customYear: string): boolean {
  const custom = customYear.trim();
  if (custom.length === 4) {
    const target = parseInt(custom, 10);
    if (!Number.isFinite(target)) return true;
    const year = getItemYear(item);
    return year === target;
  }

  if (decade === 'any') return true;
  const year = getItemYear(item);
  if (year === null) return false;

  if (decade === 'older') return year < 1900;

  const match = decade.match(/^(\d{4})s$/);
  if (!match) return true;
  const start = parseInt(match[1], 10);
  return year >= start && year <= start + 9;
}

export const RELEASE_DECADES: { value: string; label: string }[] = [
  { value: 'any', label: 'Any year' },
  { value: '2020s', label: '2020s' },
  { value: '2010s', label: '2010s' },
  { value: '2000s', label: '2000s' },
  { value: '1990s', label: '1990s' },
  { value: '1980s', label: '1980s' },
  { value: '1970s', label: '1970s' },
  { value: '1960s', label: '1960s' },
  { value: '1950s', label: '1950s' },
  { value: '1940s', label: '1940s' },
  { value: '1930s', label: '1930s' },
  { value: '1920s', label: '1920s' },
  { value: '1910s', label: '1910s' },
  { value: '1900s', label: '1900s' },
  { value: 'older', label: 'Before 1900' },
];

function matchesMediaType(item: LocalFile, filter: MediaTypeFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'tv') return !!item.isFolder;
  return !item.isFolder;
}

function matchesWatchedFilter(
  item: LocalFile,
  filter: WatchedFilter,
  progresses: Record<string, number>,
  profileId: string | null | undefined,
): boolean {
  if (filter === 'all' || !profileId) return true;

  if (filter === 'partial') {
    return isPartiallyWatched(item, progresses, profileId);
  }

  if (item.isFolder) {
    if (filter === 'watched') return isSeriesWatched(item, progresses, profileId);
    return hasUnwatchedEpisode(item, progresses, profileId);
  }
  const w = isWatched(item, progresses, profileId);
  return filter === 'watched' ? w : !w;
}

export function applyCatalogFilters(
  items: LocalFile[],
  filters: CatalogFilters,
  progresses: Record<string, number>,
  profileId: string | null | undefined,
): LocalFile[] {
  return items.filter(
    (item) =>
      matchesMediaType(item, filters.mediaType) &&
      matchesWatchedFilter(item, filters.watched, progresses, profileId) &&
      matchesGenre(item, filters.genres) &&
      matchesLengthRange(item, filters.lengthMin, filters.lengthMax) &&
      matchesYearFilter(item, filters.decade, filters.customYear) &&
      matchesDirectorFilter(item, filters.director),
  );
}
