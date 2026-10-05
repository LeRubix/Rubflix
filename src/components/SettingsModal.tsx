import { useState, useEffect } from 'react';
import { X, Palette, Image as ImageIcon, Save, Type, Maximize, Settings as SettingsIcon, MonitorPlay, ScreenShare, ShieldAlert, Check, User, Upload, Edit2, FolderOpen, Trash2 } from 'lucide-react';
import type { Profile } from './ProfilesScreen';
import {
  DEFAULT_TMDB_KEY_MASK,
  MAX_APP_NAME_LENGTH,
  isUsingDefaultTmdbApiKey,
  truncateAppName,
} from '../utils/settings';

export interface Settings {
  accentColor: string;
  wallpaperPath: string;
  overlayOpacity: number;
  appName: string;
  uiScale: number;
  useExternalPlayer: boolean;
  externalPlayerPath: string;
  movieFolders: string[];
  tvFolders: string[];
  skipProfilePicker: boolean;
  defaultProfileId: string | null;
  compactLibraryButton: boolean;
  appIcon: 'default' | 'alternate';
  autoSyncLibrary: boolean;
  customTmdbApiKey: string;
  watchedIndicatorMode: 'always' | 'hover' | 'never';
}

const RECENT_COLORS = ['#003e8f', '#bc13fe', '#E50914', '#555555', '#7b4cff'];

const AVATAR_OPTIONS = Array.from({ length: 9 }, (_, i) => `./avatars/key${i + 1}.jpg`);

export function SettingsModal({ onClose, onSave, currentSettings, activeProfileId: _activeProfileId, initialTab = 'general', onScanLibrary, librarySyncing = false }: { 
  onClose: () => void, 
  onSave: (settings: Settings) => void,
  currentSettings: Settings,
  activeProfileId?: string | null,
  initialTab?: 'general' | 'library' | 'personalization' | 'profiles' | 'advanced',
  onScanLibrary?: () => void | Promise<void>,
  librarySyncing?: boolean,
}) {
  const [settings, setSettings] = useState<Settings>({
    ...currentSettings,
    appName: truncateAppName(currentSettings.appName ?? 'Kudflix'),
    movieFolders: currentSettings.movieFolders ?? [],
    tvFolders: currentSettings.tvFolders ?? [],
    skipProfilePicker: currentSettings.skipProfilePicker ?? false,
    defaultProfileId: currentSettings.defaultProfileId ?? null,
    compactLibraryButton: currentSettings.compactLibraryButton ?? false,
    appIcon: currentSettings.appIcon ?? 'default',
    autoSyncLibrary: currentSettings.autoSyncLibrary ?? true,
    customTmdbApiKey: currentSettings.customTmdbApiKey ?? '',
    watchedIndicatorMode: currentSettings.watchedIndicatorMode ?? 'always',
  });
  const [activeTab, setActiveTab] = useState<'general' | 'library' | 'personalization' | 'profiles' | 'advanced'>(initialTab);
  const [isDefaultTmdbKeyMode, setIsDefaultTmdbKeyMode] = useState(
    isUsingDefaultTmdbApiKey(currentSettings.customTmdbApiKey),
  );
  const [tmdbKeyInput, setTmdbKeyInput] = useState(
    currentSettings.customTmdbApiKey?.trim() || DEFAULT_TMDB_KEY_MASK,
  );
  const [tmdbKeyError, setTmdbKeyError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [showAvatarGrid, setShowAvatarGrid] = useState(false);
  const [iconPreviews, setIconPreviews] = useState<{ default: string | null; alternate: string | null }>({ default: null, alternate: null });

  useEffect(() => {
    const saved = localStorage.getItem('netflix_profiles');
    if (saved) setProfiles(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.getAppIconPath) return;
    Promise.all([
      api.getAppIconPath('default'),
      api.getAppIconPath('alternate'),
    ]).then(([defaultPath, alternatePath]) => {
      setIconPreviews({ default: defaultPath, alternate: alternatePath });
    });
  }, []);

  const applyAppIcon = (variant: 'default' | 'alternate') => {
    window.electronAPI?.setAppIcon?.(variant);
  };

  const handleSave = async () => {
    const customTmdbApiKey =
      isDefaultTmdbKeyMode || !tmdbKeyInput.trim() || tmdbKeyInput === DEFAULT_TMDB_KEY_MASK
        ? ''
        : tmdbKeyInput.trim();

    const next = {
      ...settings,
      appName: truncateAppName(settings.appName),
      customTmdbApiKey,
    };

    if (customTmdbApiKey && navigator.onLine) {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(customTmdbApiKey)}`,
        );
        if (res.status === 401) {
          setTmdbKeyError('Invalid API key. Check your key at themoviedb.org');
          return;
        }
      } catch {
        // offline, allow save
      }
    }

    setTmdbKeyError(null);
    applyAppIcon(next.appIcon ?? 'default');
    onSave(next);
    onClose();
  };

  const handleTmdbKeyFocus = () => {
    if (isDefaultTmdbKeyMode) {
      setIsDefaultTmdbKeyMode(false);
      setTmdbKeyInput('');
    }
  };

  const handleResetTmdbKey = () => {
    setIsDefaultTmdbKeyMode(true);
    setTmdbKeyInput(DEFAULT_TMDB_KEY_MASK);
    setTmdbKeyError(null);
    setSettings({ ...settings, customTmdbApiKey: '' });
  };

  const pickWallpaper = async () => {
    if (!window.electronAPI?.selectWallpaperImage) return;
    const path = await window.electronAPI.selectWallpaperImage();
    if (path) setSettings({ ...settings, wallpaperPath: path });
  };

  const addFolders = async (type: 'movie' | 'tv') => {
    if (!window.electronAPI?.selectFolders) return;
    const selected = await window.electronAPI.selectFolders();
    if (!selected.length) return;
    const key = type === 'movie' ? 'movieFolders' : 'tvFolders';
    const existing = settings[key];
    const merged = [...existing];
    for (const folder of selected) {
      if (!merged.includes(folder)) merged.push(folder);
    }
    setSettings({ ...settings, [key]: merged });
  };

  const removeFolder = (type: 'movie' | 'tv', folder: string) => {
    const key = type === 'movie' ? 'movieFolders' : 'tvFolders';
    setSettings({ ...settings, [key]: settings[key].filter(f => f !== folder) });
  };

  const handleCustomAvatarUpload = async () => {
    if (!editingProfile || !window.electronAPI?.cacheProfileImage) return;
    const cachedPath = await window.electronAPI.cacheProfileImage();
    if (!cachedPath) return;
    const updated = { ...editingProfile, avatar: cachedPath };
    setEditingProfile(updated);
    const newProfiles = profiles.map(p => p.id === updated.id ? updated : p);
    setProfiles(newProfiles);
    localStorage.setItem('netflix_profiles', JSON.stringify(newProfiles));
    setShowAvatarGrid(false);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 overflow-y-auto p-4">
      <div className="mx-auto flex min-h-full w-full max-w-[920px] items-center justify-center py-2">
      <div className="bg-[#181818] w-full max-h-[calc(100vh-2rem)] rounded-xl shadow-2xl border border-gray-800 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-1/3 bg-[#111] p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-800 flex flex-col gap-2 shrink-0 overflow-y-auto max-h-[40vh] md:max-h-none min-h-0">
          <h2 className="text-xl font-bold mb-6 text-white px-2">Settings</h2>
          
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'general' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}
          >
            <SettingsIcon className="w-5 h-5" /> General
          </button>
          <button 
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'library' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}
          >
            <FolderOpen className="w-5 h-5" /> Library
          </button>
          <button 
            onClick={() => setActiveTab('personalization')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'personalization' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}
          >
            <Palette className="w-5 h-5" /> Personalization
          </button>
          <button 
            onClick={() => setActiveTab('profiles')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'profiles' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}
          >
            <User className="w-5 h-5" /> Profiles
          </button>
          <button 
            onClick={() => setActiveTab('advanced')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${activeTab === 'advanced' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}
          >
            <ShieldAlert className="w-5 h-5" /> Advanced
          </button>
        </div>

        {/* Content Area */}
        <div className="w-full md:w-2/3 flex flex-col min-h-0 min-w-0 flex-1">
          <div className="shrink-0 flex justify-end px-4 pt-4 pb-2 border-b border-gray-800/60 md:border-b-0 md:pb-0">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
              aria-label="Close settings"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-8 pt-4 md:pt-2 min-h-0">
          {activeTab === 'general' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-white mb-6">General Settings</h3>
              
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                  <Type className="w-4 h-4" /> App Title
                </label>
                <input 
                  type="text" 
                  value={settings.appName}
                  maxLength={MAX_APP_NAME_LENGTH}
                  onChange={(e) => setSettings({ ...settings, appName: e.target.value.slice(0, MAX_APP_NAME_LENGTH) })}
                  className="bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white outline-none w-full focus:border-accent transition"
                  placeholder="e.g., JOHNFLIX"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Replaces the Netflix logo in the top corner.{' '}
                  <span className={settings.appName.length >= MAX_APP_NAME_LENGTH ? 'text-accent font-semibold' : ''}>
                    {settings.appName.length}/{MAX_APP_NAME_LENGTH}
                  </span>{' '}
                  characters.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                  <Maximize className="w-4 h-4" /> UI Scale: {Math.round(settings.uiScale * 100)}%
                </label>
                <input 
                  type="range" 
                  min="0.5" max="1.5" step="0.05"
                  value={settings.uiScale}
                  onChange={(e) => setSettings({ ...settings, uiScale: parseFloat(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>

              <div className="flex items-center justify-between bg-black/50 border border-gray-700 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-300">Icon-only library button</p>
                  <p className="text-xs text-gray-500 mt-1">Show Manage Library as a header icon like Search and Settings.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.compactLibraryButton}
                  onClick={() => setSettings({ ...settings, compactLibraryButton: !settings.compactLibraryButton })}
                  className={`relative w-12 h-6 rounded-full transition ${settings.compactLibraryButton ? 'bg-accent' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.compactLibraryButton ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Watched indicator</label>
                <select
                  value={settings.watchedIndicatorMode}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      watchedIndicatorMode: e.target.value as Settings['watchedIndicatorMode'],
                    })
                  }
                  className="bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white outline-none w-full focus:border-accent transition"
                >
                  <option value="always">Always Show</option>
                  <option value="hover">On Hover</option>
                  <option value="never">Never Show</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Controls the eye icon on watched thumbnails. Watched status is always tracked for filters and toggles.
                </p>
              </div>

            </div>
          )}

          {activeTab === 'library' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-white mb-6">Library Folders</h3>
              <p className="text-sm text-gray-400 -mt-4 mb-6">
                Add one or more folders for movies and TV shows. Each section scans its own folders independently.
              </p>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">Movie Folders</label>
                <div className="space-y-2 mb-3">
                  {settings.movieFolders.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No movie folders selected.</p>
                  ) : settings.movieFolders.map(folder => (
                    <div key={folder} className="flex items-center gap-2 bg-black/50 border border-gray-700 rounded-lg px-3 py-2">
                      <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-300 truncate flex-grow" title={folder}>{folder}</span>
                      <button onClick={() => removeFolder('movie', folder)} className="text-gray-500 hover:text-red-400 transition flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addFolders('movie')}
                  className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white text-sm font-semibold transition"
                >
                  <FolderOpen className="w-4 h-4" /> Add Movie Folder(s)
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">TV Show Folders</label>
                <div className="space-y-2 mb-3">
                  {settings.tvFolders.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No TV show folders selected.</p>
                  ) : settings.tvFolders.map(folder => (
                    <div key={folder} className="flex items-center gap-2 bg-black/50 border border-gray-700 rounded-lg px-3 py-2">
                      <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-300 truncate flex-grow" title={folder}>{folder}</span>
                      <button onClick={() => removeFolder('tv', folder)} className="text-gray-500 hover:text-red-400 transition flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addFolders('tv')}
                  className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white text-sm font-semibold transition"
                >
                  <FolderOpen className="w-4 h-4" /> Add TV Folder(s)
                </button>
              </div>

              <div className="border-t border-gray-800 pt-8 space-y-4">
                <div className="flex items-center justify-between bg-black/50 border border-gray-700 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-300">Auto-sync library</p>
                    <p className="text-xs text-gray-500 mt-1">Automatically refresh when files are added or removed in your folders.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.autoSyncLibrary}
                    onClick={() => setSettings({ ...settings, autoSyncLibrary: !settings.autoSyncLibrary })}
                    className={`relative w-12 h-6 rounded-full transition ${settings.autoSyncLibrary ? 'bg-accent' : 'bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.autoSyncLibrary ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                {onScanLibrary && (
                  <button
                    type="button"
                    onClick={() => onScanLibrary()}
                    disabled={librarySyncing}
                    className="flex items-center gap-2 bg-accent hover:opacity-90 disabled:opacity-50 px-4 py-2 rounded-lg text-white text-sm font-semibold transition"
                  >
                    {librarySyncing ? 'Scanning…' : 'Scan library now'}
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'personalization' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-white mb-6">Personalization</h3>

              {/* Accent Color Section matching the user's screenshot */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Accent Color</label>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-12 h-12 rounded overflow-hidden border-2 border-gray-600 focus-within:border-white transition shadow-lg bg-black">
                    <input 
                      type="color" 
                      value={settings.accentColor}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                    />
                  </div>
                  <span className="text-gray-300 text-sm font-mono tracking-wider">{settings.accentColor}</span>
                </div>
                
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-gray-500 mb-2">Recent colors</label>
                  <div className="flex gap-2">
                    {RECENT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSettings({ ...settings, accentColor: color })}
                        className={`w-10 h-10 rounded border-2 transition relative ${settings.accentColor.toLowerCase() === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: color }}
                      >
                        {settings.accentColor.toLowerCase() === color && (
                          <div className="absolute -top-1 -right-1 bg-black rounded-full border border-gray-600 p-0.5">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Custom Wallpaper</label>
                <button
                  type="button"
                  onClick={pickWallpaper}
                  className="flex items-center gap-3 bg-black/50 border border-gray-700 rounded-lg px-4 py-3 w-full hover:border-gray-500 transition cursor-pointer group text-left"
                >
                  <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-white shrink-0" />
                  <span className="text-sm text-gray-300 truncate">
                    {settings.wallpaperPath ? settings.wallpaperPath.split(/[/\\]/).pop() : 'Click to browse...'}
                  </span>
                </button>
                {settings.wallpaperPath && (
                  <button 
                    onClick={() => setSettings({ ...settings, wallpaperPath: '' })}
                    className="text-xs text-red-500 mt-2 hover:underline font-semibold"
                  >
                    Remove Wallpaper
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Background Darkness: {Math.round(settings.overlayOpacity * 100)}%
                </label>
                <input 
                  type="range" 
                  min="0" max="1" step="0.1"
                  value={settings.overlayOpacity}
                  onChange={(e) => setSettings({ ...settings, overlayOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">App Icon</label>
                <p className="text-xs text-gray-500 mb-3">Changes the window and taskbar icon while the app is running.</p>
                <div className="flex gap-4">
                  {(['default', 'alternate'] as const).map((variant) => (
                    <button
                      key={variant}
                      type="button"
                      onClick={() => {
                        setSettings({ ...settings, appIcon: variant });
                        applyAppIcon(variant);
                      }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition ${
                        settings.appIcon === variant ? 'border-white bg-white/5' : 'border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      {iconPreviews[variant] ? (
                        <img src={iconPreviews[variant]!} alt="" className="w-12 h-12 rounded object-contain bg-black/30" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-800" />
                      )}
                      <span className="text-xs font-semibold text-gray-300 capitalize">{variant}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'profiles' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-white mb-2">Profiles</h3>

              {!editingProfile && (
                <div
                  className="flex items-center gap-3 mb-4 bg-gray-800/30 p-4 rounded-lg border border-gray-800 cursor-pointer hover:bg-gray-800/50 transition"
                  onClick={() => {
                    const next = !settings.skipProfilePicker;
                    let defaultProfileId = settings.defaultProfileId;
                    if (next && !defaultProfileId && profiles.length > 0) {
                      defaultProfileId = profiles[0].id;
                    }
                    setSettings({ ...settings, skipProfilePicker: next, defaultProfileId });
                  }}
                >
                  <User className="w-5 h-5 text-accent flex-shrink-0" />
                  <div className="flex-grow min-w-0">
                    <span className="text-sm font-bold text-white block">Skip profile selection on startup</span>
                    <span className="text-xs text-gray-400">Sign in with your default profile automatically</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.skipProfilePicker}
                    onChange={(e) => {
                      const next = e.target.checked;
                      let defaultProfileId = settings.defaultProfileId;
                      if (next && !defaultProfileId && profiles.length > 0) {
                        defaultProfileId = profiles[0].id;
                      }
                      setSettings({ ...settings, skipProfilePicker: next, defaultProfileId });
                    }}
                    className="w-5 h-5 accent-accent flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
              
              {editingProfile && showAvatarGrid ? (
                // Avatar grid picker
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-4">Choose Avatar for {editingProfile.name}</h4>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {AVATAR_OPTIONS.map((avatar, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const updated = { ...editingProfile, avatar };
                          setEditingProfile(updated);
                          const newProfiles = profiles.map(p => p.id === updated.id ? updated : p);
                          setProfiles(newProfiles);
                          localStorage.setItem('netflix_profiles', JSON.stringify(newProfiles));
                          setShowAvatarGrid(false);
                        }}
                        className={`w-full aspect-square rounded-lg overflow-hidden border-4 transition-all duration-200 hover:scale-105 ${editingProfile.avatar === avatar ? 'border-white' : 'border-transparent hover:border-gray-500'}`}
                      >
                        <img src={avatar} alt={`Avatar ${i + 1}`} className='w-full h-full object-cover' />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleCustomAvatarUpload}
                    className='inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white text-sm font-semibold transition'
                  >
                    <Upload className='w-4 h-4' /> Upload Custom
                  </button>
                  <button onClick={() => setShowAvatarGrid(false)} className="ml-2 text-sm text-gray-400 hover:text-white transition">Cancel</button>
                </div>
              ) : editingProfile ? (
                // Edit profile inline
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setShowAvatarGrid(true)} className="w-20 h-20 rounded-lg overflow-hidden border-2 border-transparent hover:border-white transition-all group relative flex-shrink-0">
                      <img src={editingProfile.avatar} className="w-full h-full object-cover" />
                      <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                        <Edit2 className='w-5 h-5 text-white' />
                      </div>
                    </button>
                    <div className="flex-grow space-y-2">
                      <input 
                        type="text" value={editingProfile.name}
                        onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
                        className="bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none w-full focus:border-white transition"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Color</span>
                        <input type="color" value={editingProfile.color} onChange={e => setEditingProfile({ ...editingProfile, color: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      const exists = profiles.find(p => p.id === editingProfile.id);
                      let newProfiles;
                      if (exists) {
                        newProfiles = profiles.map(p => p.id === editingProfile.id ? editingProfile : p);
                      } else {
                        newProfiles = [...profiles, editingProfile];
                      }
                      setProfiles(newProfiles);
                      localStorage.setItem('netflix_profiles', JSON.stringify(newProfiles));
                      setEditingProfile(null);
                    }} className="bg-white text-black px-4 py-1.5 rounded text-sm font-bold hover:bg-gray-200 transition">Save</button>
                    <button onClick={() => setEditingProfile(null)} className="text-gray-400 text-sm hover:text-white transition px-4 py-1.5 border border-gray-600 rounded">Cancel</button>
                    {profiles.find(p => p.id === editingProfile.id) && profiles.length > 1 && (
                      <button onClick={() => {
                        const newProfiles = profiles.filter(p => p.id !== editingProfile.id);
                        setProfiles(newProfiles);
                        localStorage.setItem('netflix_profiles', JSON.stringify(newProfiles));
                        if (settings.defaultProfileId === editingProfile.id) {
                          setSettings({
                            ...settings,
                            defaultProfileId: newProfiles[0]?.id ?? null,
                            skipProfilePicker: newProfiles.length > 0 && settings.skipProfilePicker,
                          });
                        }
                        setEditingProfile(null);
                      }} className="ml-auto text-red-500 text-sm hover:text-white hover:bg-red-500 transition px-4 py-1.5 border border-red-500 rounded font-bold">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // Profile list
                <div className="space-y-3">
                  {settings.skipProfilePicker && (
                    <p className="text-xs text-gray-500 mb-1">Default profile:</p>
                  )}
                  {profiles.map(p => (
                    <div key={p.id} className={`flex items-center gap-4 p-3 rounded-lg border transition group ${settings.defaultProfileId === p.id && settings.skipProfilePicker ? 'bg-gray-800/60 border-accent/40' : 'bg-gray-800/30 border-gray-800 hover:bg-gray-800/50'}`}>
                      <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 border-2 border-transparent group-hover:border-gray-600 transition" style={{ backgroundColor: p.color }}>
                        <img src={p.avatar} className="w-full h-full object-cover" alt="" />
                      </div>
                      <span className="text-white font-semibold flex-grow truncate">{p.name}</span>
                      {settings.skipProfilePicker && (
                        <button
                          onClick={() => setSettings({ ...settings, defaultProfileId: p.id })}
                          className={`text-xs font-bold px-3 py-1 rounded transition flex-shrink-0 ${settings.defaultProfileId === p.id ? 'bg-accent text-white' : 'bg-gray-700/50 text-gray-400 hover:text-white'}`}
                        >
                          {settings.defaultProfileId === p.id ? 'Default' : 'Set default'}
                        </button>
                      )}
                      <button onClick={() => setEditingProfile(p)} className="text-gray-400 hover:text-white text-sm font-semibold transition bg-gray-700/50 px-3 py-1 rounded flex-shrink-0">Edit</button>
                    </div>
                  ))}
                  
                  <button onClick={() => {
                    setEditingProfile({
                      id: Date.now().toString(),
                      name: 'New Profile',
                      color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
                      avatar: `./avatars/key${Math.floor(Math.random() * 9) + 1}.jpg`
                    });
                  }} className="w-full flex items-center justify-center gap-2 bg-gray-800/30 hover:bg-gray-800/80 p-3 rounded-lg border border-gray-700 border-dashed text-gray-400 hover:text-white transition font-semibold">
                    + Add New Profile
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-white mb-6">Advanced Settings</h3>

              <div className="space-y-3">
                <label className="block text-sm font-bold text-white">TMDB API Key</label>
                <input
                  type={isDefaultTmdbKeyMode && !settings.customTmdbApiKey.trim() ? 'password' : 'text'}
                  value={tmdbKeyInput}
                  onFocus={handleTmdbKeyFocus}
                  onChange={(e) => {
                    setTmdbKeyInput(e.target.value);
                    setTmdbKeyError(null);
                    if (e.target.value.trim() && e.target.value !== DEFAULT_TMDB_KEY_MASK) {
                      setIsDefaultTmdbKeyMode(false);
                    }
                  }}
                  className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-accent transition font-mono"
                  placeholder="Enter your TMDB API key"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-xs text-gray-500">
                  Used for posters, descriptions, and episode info. Get a free key at{' '}
                  <a
                    href="https://www.themoviedb.org/settings/api"
                    className="text-gray-400 hover:text-white underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    themoviedb.org/settings/api
                  </a>
                  .
                  {isUsingDefaultTmdbApiKey(settings.customTmdbApiKey) && isDefaultTmdbKeyMode && (
                    <>
                      <br />
                      <span className="text-gray-400 italic">Currently using built-in default key.</span>
                    </>
                  )}
                </p>
           
                {tmdbKeyError && <p className="text-xs text-red-400">{tmdbKeyError}</p>}
                <button
                  type="button"
                  onClick={handleResetTmdbKey}
                  disabled={isUsingDefaultTmdbApiKey(settings.customTmdbApiKey) && isDefaultTmdbKeyMode}
                  className="text-sm text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
                >
                  Reset to default
                </button>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-4 bg-gray-800/30 p-4 rounded-lg border border-gray-800 cursor-pointer hover:bg-gray-800/50 transition"
                     onClick={() => setSettings({ ...settings, useExternalPlayer: !settings.useExternalPlayer })}>
                  <MonitorPlay className="w-5 h-5 text-accent" />
                  <div className="flex-grow">
                    <label className="text-sm font-bold text-white block cursor-pointer">
                      Use External Video Player
                    </label>
                    <span className="text-xs text-gray-400">Launch VLC or PotPlayer instead of internal player</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={settings.useExternalPlayer}
                    onChange={(e) => setSettings({ ...settings, useExternalPlayer: e.target.checked })}
                    className="w-5 h-5 accent-accent"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                {settings.useExternalPlayer && (
                  <div className="ml-2 pl-4 border-l-2 border-gray-700 space-y-2 animate-in slide-in-from-top-2">
                    <label className="block text-xs font-semibold text-gray-400">Path to Player Executable (.exe)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={settings.externalPlayerPath}
                        onChange={(e) => setSettings({ ...settings, externalPlayerPath: e.target.value })}
                        className="bg-black/50 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white outline-none flex-grow focus:border-accent transition"
                        placeholder="C:\Program Files\DAUM\PotPlayer\PotPlayer64.exe"
                      />
                      <button 
                        onClick={async () => {
                          const path = await window.electronAPI.selectFile();
                          if (path) setSettings({ ...settings, externalPlayerPath: path });
                        }}
                        className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white text-sm font-bold transition shadow"
                      >
                        Browse
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <ScreenShare className="w-5 h-5 text-accent" />
                  <span className="text-sm font-bold text-white">Streaming to Discord or OBS</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Video is drawn in its own window, so sharing the main {settings.appName} window shows
                  the library but not the media. To let viewers see what&rsquo;s playing, either share
                  your whole screen, or pick the{' '}
                  <span className="text-gray-200 font-semibold">{settings.appName} Player</span> window
                  from the share menu once playback has started.
                </p>
              </div>

              <div className="pt-6 border-t border-gray-800">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Kudflix uses <a href="https://mpv.io" className="text-gray-400 hover:text-white underline" target="_blank" rel="noreferrer">mpv</a> (LGPL-2.1) for media playback.
                  Source: <a href="https://github.com/mpv-player/mpv" className="text-gray-400 hover:text-white underline" target="_blank" rel="noreferrer">github.com/mpv-player/mpv</a>
                </p>
              </div>

              <div className="pt-8 mt-4 border-t border-gray-800">
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to completely reset all settings and library data? The app will reload.")) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="text-red-500 text-sm hover:underline font-semibold"
                >
                  Reset All App Data
                </button>
              </div>
            </div>
          )}

          </div>

          {/* Action Footer */}
          <div className="shrink-0 border-t border-gray-800 px-8 py-4 flex justify-end bg-[#181818]">
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-accent text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Save className="w-5 h-5" />
              Apply Changes
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
