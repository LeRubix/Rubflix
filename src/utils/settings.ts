import type { Settings } from '../components/SettingsModal';

export const MAX_APP_NAME_LENGTH = 50;
export const DEFAULT_TMDB_API_KEY = '4f9f2f84e320ca3494c1fe586f3a5318';
export const DEFAULT_TMDB_KEY_MASK = '••••••••••••••••••••••••••••••••';

export function isUsingDefaultTmdbApiKey(customKey?: string): boolean {
  return !customKey?.trim();
}

export function getEffectiveTmdbApiKey(customKey?: string): string {
  const key = customKey?.trim();
  return key || DEFAULT_TMDB_API_KEY;
}

/** Read the active TMDB key from persisted settings. */
export function getActiveTmdbApiKey(): string {
  try {
    const saved = localStorage.getItem('netflix_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return getEffectiveTmdbApiKey(parsed.customTmdbApiKey);
    }
  } catch {
    // ignore
  }
  return DEFAULT_TMDB_API_KEY;
}

export function truncateAppName(name: string): string {
  return name.slice(0, MAX_APP_NAME_LENGTH);
}

export const DEFAULT_APP_NAME = 'Rubflix';

const DEFAULT_SETTINGS: Settings = {
  accentColor: '#E50914',
  wallpaperPath: '',
  overlayOpacity: 0.5,
  appName: DEFAULT_APP_NAME,
  uiScale: 1.0,
  useExternalPlayer: false,
  externalPlayerPath: '',
  movieFolders: [],
  tvFolders: [],
  skipProfilePicker: false,
  defaultProfileId: null,
  compactLibraryButton: false,
  autoSyncLibrary: true,
  customTmdbApiKey: '',
  watchedIndicatorMode: 'always' as const,
};

export function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem('netflix_settings');
    const legacyLibrary = localStorage.getItem('netflix_library');

    if (saved) {
      const parsed = JSON.parse(saved);
      const movieFolders = parsed.movieFolders?.length
        ? parsed.movieFolders
        : legacyLibrary ? [legacyLibrary] : [];

      const accentColor = parsed.accentColor ?? DEFAULT_SETTINGS.accentColor;

      return {
        accentColor: accentColor === '#cf3f4c' ? '#E50914' : accentColor,
        wallpaperPath: parsed.wallpaperPath ?? '',
        overlayOpacity: parsed.overlayOpacity ?? DEFAULT_SETTINGS.overlayOpacity,
        appName: truncateAppName(
          parsed.appName === 'Kudflix' ? DEFAULT_APP_NAME : (parsed.appName ?? DEFAULT_SETTINGS.appName),
        ),
        uiScale: parsed.uiScale ?? DEFAULT_SETTINGS.uiScale,
        useExternalPlayer: parsed.useExternalPlayer ?? false,
        externalPlayerPath: parsed.externalPlayerPath ?? '',
        movieFolders,
        tvFolders: parsed.tvFolders ?? [],
        skipProfilePicker: parsed.skipProfilePicker ?? false,
        defaultProfileId: parsed.defaultProfileId ?? null,
        compactLibraryButton: parsed.compactLibraryButton ?? DEFAULT_SETTINGS.compactLibraryButton,
        autoSyncLibrary: parsed.autoSyncLibrary ?? DEFAULT_SETTINGS.autoSyncLibrary,
        customTmdbApiKey: parsed.customTmdbApiKey ?? '',
        watchedIndicatorMode:
          parsed.watchedIndicatorMode === 'hover' || parsed.watchedIndicatorMode === 'never'
            ? parsed.watchedIndicatorMode
            : 'always',
      };
    }

    if (legacyLibrary) {
      return { ...DEFAULT_SETTINGS, movieFolders: [legacyLibrary] };
    }
  } catch {
    // fall through to defaults
  }

  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: Settings): void {
  const json = JSON.stringify(settings);
  if (localStorage.getItem('netflix_settings') === json) return;
  localStorage.setItem('netflix_settings', json);
}
