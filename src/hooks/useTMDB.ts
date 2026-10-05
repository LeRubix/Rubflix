import { useEffect, useState } from 'react';
import type { LocalFile } from '../components/NetflixUI';
import { getMediaOverride, isTmdbDisabled } from '../utils/mediaOverrides';
import {
  getCachedForVideo,
  getTMDBMetadataForVideo,
  type TMDBResult,
} from '../utils/tmdb';

/** Fetch TMDB metadata for a library item, using cache + in-flight dedup. */
export function useTMDB(video: LocalFile | null | undefined): TMDBResult | null {
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

    const cached = getCachedForVideo(video);
    if (cached !== undefined) {
      setTmdb(cached);
      return;
    }

    let cancelled = false;
    getTMDBMetadataForVideo(video).then((res) => {
      if (!cancelled) setTmdb(res);
    });

    return () => {
      cancelled = true;
    };
  }, [video?.path, video?.name, video?.category, video?.isFolder, video?.relativePath, video?.meta?.title, video?.meta?.year, video?.tmdbDisabled, getMediaOverride(video?.path ?? '')?.tmdbId, disabled]);

  return tmdb;
}
