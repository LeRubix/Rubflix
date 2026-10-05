import { useEffect, useState } from 'react';
import type { LocalFile } from '../components/NetflixUI';
import { getMediaOverride, isTmdbDisabled } from '../utils/mediaOverrides';
import {
  fetchTMDBDetailsForVideo,
  getCachedForVideo,
  getTMDBMetadataForVideo,
  type TMDBResult,
} from '../utils/tmdb';

/**
 * TMDB metadata with lazy details fetch (genres, director, cast).
 * Search data loads first; details + credits fetch when modal opens.
 */
export function useTMDBDetails(video: LocalFile | null | undefined): TMDBResult | null {
  const disabled = isTmdbDisabled(video);

  const [tmdb, setTmdb] = useState<TMDBResult | null>(() => {
    if (!video || disabled) return null;
    const cached = getCachedForVideo(video);
    return cached === undefined ? null : cached;
  });

  useEffect(() => {
    if (!video || isTmdbDisabled(video)) {
      setTmdb(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const cached = getCachedForVideo(video);
      if (cached?.detailsFetched) {
        if (!cancelled) setTmdb(cached);
        return;
      }

      if (cached === undefined) {
        const searchResult = await getTMDBMetadataForVideo(video);
        if (cancelled) return;
        if (!searchResult) {
          setTmdb(null);
          return;
        }
        if (searchResult.detailsFetched) {
          setTmdb(searchResult);
          return;
        }
      }

      const detailed = await fetchTMDBDetailsForVideo(video);
      if (!cancelled) setTmdb(detailed);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [
    video?.path,
    video?.name,
    video?.category,
    video?.isFolder,
    video?.relativePath,
    video?.meta?.title,
    video?.meta?.year,
    video?.tmdbDisabled,
    getMediaOverride(video?.path ?? '')?.tmdbId,
    disabled,
  ]);

  return tmdb;
}
