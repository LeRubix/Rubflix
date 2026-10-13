import { getCachedDuration, setCachedDuration } from './mediaCache';
import { getCachedMedia, setCachedMedia } from './thumbnailCache';
import { isEnrichCancelled, clearEnrichCancel } from './enrichCancel';

const MAX_THUMB_WIDTH = 1280;
const THUMB_TIMEOUT_MS = 12000;

const activeVideos = new Map<string, HTMLVideoElement>();

function normPath(p: string): string {
  return p.replace(/\//g, '\\').toLowerCase();
}

function disposeVideo(videoPath: string, video: HTMLVideoElement) {
  video.onloadedmetadata = null;
  video.onseeked = null;
  video.onerror = null;
  video.removeAttribute('src');
  video.src = '';
  video.load();
  video.remove();
  if (activeVideos.get(normPath(videoPath)) === video) {
    activeVideos.delete(normPath(videoPath));
  }
}

/** Release a file lock held by an in-flight thumbnail `<video>` element. */
export function releaseVideoForPath(videoPath: string): void {
  const key = normPath(videoPath);
  const video = activeVideos.get(key);
  if (video) disposeVideo(videoPath, video);
}

export async function generateVideoThumbnail(
  videoPath: string,
  skipThumbnail: boolean = false,
  mtimeMs?: number,
): Promise<{ thumbnail: string | null; duration: number }> {
  if (isEnrichCancelled(videoPath)) {
    return { thumbnail: null, duration: getCachedDuration(videoPath) ?? 0 };
  }

  const diskCache = await getCachedMedia(videoPath, mtimeMs);
  if (diskCache) {
    if (diskCache.duration > 0) setCachedDuration(videoPath, diskCache.duration);
    if (skipThumbnail || diskCache.thumbnail) {
      return { thumbnail: diskCache.thumbnail, duration: diskCache.duration };
    }
  }

  const cachedDuration = getCachedDuration(videoPath);
  if (skipThumbnail && cachedDuration) {
    return { thumbnail: null, duration: cachedDuration };
  }

  if (window.electronAPI?.pathExists) {
    const exists = await window.electronAPI.pathExists(videoPath);
    if (!exists || isEnrichCancelled(videoPath)) {
      return { thumbnail: null, duration: cachedDuration ?? 0 };
    }
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.style.display = 'none';
    video.preload = 'metadata';
    document.body.appendChild(video);
    activeVideos.set(normPath(videoPath), video);

    let settled = false;
    const finish = (result: { thumbnail: string | null; duration: number }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      disposeVideo(videoPath, video);
      clearEnrichCancel(videoPath);
      if (result.duration > 0) setCachedDuration(videoPath, result.duration);
      if (mtimeMs != null && !isEnrichCancelled(videoPath)) {
        setCachedMedia({
          path: videoPath,
          thumbnail: result.thumbnail,
          duration: result.duration,
          mtimeMs,
        });
      }
      resolve(result);
    };

    const timeout = window.setTimeout(() => {
      finish({ thumbnail: null, duration: cachedDuration ?? 0 });
    }, THUMB_TIMEOUT_MS);

    video.onloadedmetadata = () => {
      if (isEnrichCancelled(videoPath)) {
        finish({ thumbnail: null, duration: cachedDuration ?? 0 });
        return;
      }
      clearTimeout(timeout);
      const duration = video.duration || cachedDuration || 0;

      if (skipThumbnail) {
        finish({ thumbnail: null, duration });
        return;
      }

      if (video.duration) {
        video.currentTime = Math.min(5, video.duration * 0.1);
      } else {
        finish({ thumbnail: null, duration: 0 });
      }
    };

    video.onseeked = () => {
      if (isEnrichCancelled(videoPath)) {
        finish({ thumbnail: null, duration: cachedDuration ?? 0 });
        return;
      }
      try {
        const scale = video.videoWidth > MAX_THUMB_WIDTH ? MAX_THUMB_WIDTH / video.videoWidth : 1;
        const w = Math.max(1, Math.round(video.videoWidth * scale));
        const h = Math.max(1, Math.round(video.videoHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          finish({ thumbnail: canvas.toDataURL('image/jpeg', 0.82), duration: video.duration || 0 });
        } else {
          finish({ thumbnail: null, duration: video.duration || 0 });
        }
      } catch {
        finish({ thumbnail: null, duration: video.duration || 0 });
      }
    };

    video.onerror = () => {
      finish({ thumbnail: null, duration: cachedDuration ?? 0 });
    };

    video.src = `file:///${videoPath.replace(/\\/g, '/')}`;
  });
}
