const CACHE_KEY = 'kudflix_update_check_v1';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const GITHUB_LATEST =
  'https://api.github.com/repos/LeRubix/Rubflix/releases/latest';

export type AppUpdateInfo =
  | { status: 'update'; latestVersion: string; releaseUrl: string | null }
  | { status: 'current' }
  | { status: 'unknown' };

const DISMISS_PREFIX = 'kudflix_update_dismissed_';

export function isUpdateNoticeDismissed(latestVersion: string): boolean {
  try {
    return localStorage.getItem(`${DISMISS_PREFIX}${latestVersion}`) === '1';
  } catch {
    return false;
  }
}

export function dismissUpdateNotice(latestVersion: string): void {
  try {
    localStorage.setItem(`${DISMISS_PREFIX}${latestVersion}`, '1');
  } catch {
    // ignore
  }
}

type CachedPayload = {
  checkedAt: number;
  latestVersion: string | null;
  releaseUrl: string | null;
};

function parseVersionParts(v: string): number[] {
  return v
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number.parseInt(part.replace(/[^\d].*$/, ''), 10))
    .map((n) => (Number.isFinite(n) ? n : 0));
}

export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersionParts(latest);
  const b = parseVersionParts(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return false;
}

function readCache(): CachedPayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedPayload) : null;
  } catch {
    return null;
  }
}

function writeCache(payload: CachedPayload): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

async function fetchLatestRelease(): Promise<{ version: string; url: string | null } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(GITHUB_LATEST, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { tag_name?: string; html_url?: string };
    const tag = data.tag_name?.trim();
    if (!tag) return null;
    return { version: tag.replace(/^v/i, ''), url: data.html_url ?? null };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkForAppUpdate(currentVersion: string): Promise<AppUpdateInfo> {
  const now = Date.now();
  const cached = readCache();
  if (cached && now - cached.checkedAt < CACHE_TTL_MS && cached.latestVersion) {
    return isNewerVersion(cached.latestVersion, currentVersion)
      ? {
          status: 'update',
          latestVersion: cached.latestVersion,
          releaseUrl: cached.releaseUrl,
        }
      : { status: 'current' };
  }

  const latest = await fetchLatestRelease();
  if (!latest) return { status: 'unknown' };

  writeCache({
    checkedAt: now,
    latestVersion: latest.version,
    releaseUrl: latest.url,
  });

  if (isNewerVersion(latest.version, currentVersion)) {
    return {
      status: 'update',
      latestVersion: latest.version,
      releaseUrl: latest.url,
    };
  }
  return { status: 'current' };
}

export function scheduleAppUpdateCheck(
  currentVersion: string,
  onResult: (info: AppUpdateInfo) => void,
): void {
  const run = () => {
    void checkForAppUpdate(currentVersion).then(onResult);
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => run(), { timeout: 3000 });
  } else {
    setTimeout(run, 0);
  }
}
