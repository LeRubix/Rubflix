import type { TMDBResult } from './tmdb';

const ANILIST_API_URL = 'https://graphql.anilist.co';
const CACHE_KEY = 'anilist_metadata_cache_v1';

const MEDIA_QUERY = `
query ($search: String, $id: Int) {
  Media(search: $search, id: $id, type: ANIME) {
    id
    title {
      romaji
      english
      native
    }
    description(asHtml: false)
    coverImage {
      extraLarge
      large
      medium
    }
    bannerImage
    genres
    averageScore
    duration
    episodes
    format
    status
    startDate {
      year
    }
    studios(isMain: true) {
      nodes {
        name
      }
    }
  }
}
`;

export function getAniListCache(): Record<string, TMDBResult | null> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const getFullCache = getAniListCache;

function saveCache(cache: Record<string, TMDBResult | null>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

export function cleanAnimeQuery(title: string): string {
  return title
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:s\d{1,2}|season\s*\d{1,2}|e\d{1,3}|ep\s*\d{1,3}|\d{1,2}nd\s*season|\d{1,2}rd\s*season|\d{1,2}th\s*season)\b/gi, ' ')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const inflight = new Map<string, Promise<TMDBResult | null>>();

function mapAniListMedia(media: any): TMDBResult {
  const rating = typeof media.averageScore === 'number' ? Math.round((media.averageScore / 10) * 10) / 10 : 0;
  const year = media.startDate?.year ? String(media.startDate.year) : null;
  const studios = (media.studios?.nodes ?? []).map((s: { name: string }) => s.name).filter(Boolean);

  return {
    synopsis: stripHtml(media.description),
    poster: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || null,
    backdrop: media.bannerImage || media.coverImage?.extraLarge || null,
    genres: media.genres || [],
    rating,
    year,
    anilistId: media.id,
    creators: studios.length ? studios : undefined,
    runtimeMinutes: media.duration ?? undefined,
    seasons: media.episodes ? 1 : undefined,
    detailsFetched: true,
  };
}

export async function fetchAniListById(id: number): Promise<TMDBResult | null> {
  const cache = getFullCache();
  const key = `id:${id}`;
  if (key in cache) return cache[key];

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const response = await fetch(ANILIST_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: MEDIA_QUERY,
          variables: { id },
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      const media = data?.data?.Media;
      if (!media) return null;

      const result = mapAniListMedia(media);
      cache[key] = result;
      saveCache(cache);
      return result;
    } catch (err) {
      console.error('AniList by ID fetch error:', err);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export async function searchAniList(rawTitle: string): Promise<TMDBResult | null> {
  const query = cleanAnimeQuery(rawTitle);
  if (!query) return null;

  const cache = getFullCache();
  const key = `search:${query.toLowerCase()}`;
  if (key in cache) return cache[key];

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const response = await fetch(ANILIST_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: MEDIA_QUERY,
          variables: { search: query },
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      const media = data?.data?.Media;
      if (!media) return null;

      const result = mapAniListMedia(media);
      cache[key] = result;
      saveCache(cache);
      return result;
    } catch (err) {
      console.error('AniList search fetch error:', err);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export function clearAniListCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
