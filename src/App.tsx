import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  enrichLibraryInBackground,
  mergeEnrichedFiles,
  buildOptimizedEnrichQueue,
} from './utils/libraryLoader';
import { scanAllFolders, diffLibrary, mergeLibrarySync, pruneRemovedPaths } from './utils/librarySync';
import { runInitialScanOnce, resetScanSession } from './utils/scanSession';
import { Play, Info, FolderSearch, Settings as SettingsIcon, Search, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsModal } from './components/SettingsModal';
import { ContentRow, DetailModal } from './components/NetflixUI';
import type { LocalFile } from './components/NetflixUI';
import {
  applyMediaOverride,
  clearMediaOverride,
  saveMediaOverride,
  type MediaOverride,
} from './utils/mediaOverrides';
import { resolveFileMeta } from './utils/metadata';
import { loadSettings, saveSettings } from './utils/settings';
import { StartupScreen } from './components/StartupScreen';
import { ProfilesScreen } from './components/ProfilesScreen';
import { SearchOverlay } from './components/SearchOverlay';
import {
  buildSeriesFolders,
  buildContinueWatchingAll,
  buildContinueWatchingMovies,
  buildContinueWatchingSeries,
  buildTop10,
  buildSearchCatalog,
  buildHeroCatalog,
  buildGenreRows,
  resolvePlayTarget,
} from './utils/grouping';
import {
  clearTmdbCaches,
  getTMDBLookupOptions,
  invalidateTmdbForVideo,
  invalidateTmdbSession,
  prefetchTMDBCatalog,
  prefetchTMDBDetailsCatalog,
  tmdbArtwork,
} from './utils/tmdb';
import { useTMDB } from './hooks/useTMDB';
import { isTmdbDisabled } from './utils/mediaOverrides';
import { setManualWatched } from './utils/watched';
import { scheduleAppUpdateCheck, type AppUpdateInfo } from './utils/appUpdate';
import { resolveAppVersion } from './utils/appVersion';

export default function App() {
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'home' | 'tv' | 'movies'>('home');

  const [files, setFiles] = useState<LocalFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [librarySyncing, setLibrarySyncing] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<LocalFile | null>(null);
  const [infoVideo, setInfoVideo] = useState<LocalFile | null>(null);
  const [showStartup, setShowStartup] = useState(true);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'library' | 'personalization' | 'profiles' | 'advanced'>('general');
  const [settings, setSettings] = useState(loadSettings);

  const enrichGenRef = useRef(0);
  const tmdbPrefetchGenRef = useRef(0);
  const prevTmdbKeyRef = useRef(settings.customTmdbApiKey);
  const activeProfileRef = useRef(activeProfile);
  const filesRef = useRef(files);
  activeProfileRef.current = activeProfile;
  filesRef.current = files;
  const [progresses, setProgresses] = useState<Record<string, number>>({});
  const [overrideTick, setOverrideTick] = useState(0);
  const [watchedTick, setWatchedTick] = useState(0);
  const [tmdbCacheTick, setTmdbCacheTick] = useState(0);
  const [appUpdateInfo, setAppUpdateInfo] = useState<AppUpdateInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveAppVersion().then((version) => {
      if (cancelled) return;
      scheduleAppUpdateCheck(version, (info) => {
        if (!cancelled) setAppUpdateInfo(info);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleWatchedChange = useCallback(() => {
    setWatchedTick((t) => t + 1);
  }, []);

  const getInProgressPaths = (profileId: string | null): Set<string> => {
    if (!profileId) return new Set();
    try {
      const prog = JSON.parse(localStorage.getItem(`netflix_progress_${profileId}`) || '{}') as Record<string, number>;
      return new Set(Object.entries(prog).filter(([, v]) => v > 5).map(([p]) => p));
    } catch {
      return new Set();
    }
  };

  useEffect(() => {
    if (activeProfile) {
      const savedProg = localStorage.getItem(`netflix_progress_${activeProfile}`);
      if (savedProg) {
        setProgresses(JSON.parse(savedProg));
      } else {
        setProgresses({});
      }
    }
  }, [activeProfile]);

  // Enrich continue-watching episode thumbnails when a profile is selected
  useEffect(() => {
    if (!activeProfile) return;
    const paths = getInProgressPaths(activeProfile);
    if (paths.size === 0) return;

    const queue = filesRef.current
      .filter((f) => f.category && paths.has(f.path) && (!f.thumbnail || !f.duration))
      .map((f) => ({
        file: {
          name: f.name,
          path: f.path,
          relativePath: f.relativePath,
          folderName: f.folderName,
          localPoster: f.localPoster,
          localFanart: f.localFanart,
          localNfoContent: f.localNfoContent,
          mtimeMs: f.dateModified,
        },
        category: f.category as 'movie' | 'tv',
      }));
    if (queue.length === 0) return;

    const gen = ++enrichGenRef.current;
    enrichLibraryInBackground(queue, (batch) => {
      if (gen !== enrichGenRef.current) return;
      setFiles((prev) => mergeEnrichedFiles(prev, batch));
    }).catch((err) => console.error('Priority enrich failed:', err));
  }, [activeProfile]);

  const tryAutoSignIn = () => {
    if (!settings.skipProfilePicker || !settings.defaultProfileId) return false;
    try {
      const profiles = JSON.parse(localStorage.getItem('netflix_profiles') || '[]');
      if (profiles.some((p: { id: string }) => p.id === settings.defaultProfileId)) {
        setActiveProfile(settings.defaultProfileId);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const handleStartupComplete = () => {
    setShowStartup(false);
    tryAutoSignIn();
  };

  // Apply Settings to CSS Variables
  useEffect(() => {
    document.documentElement.style.setProperty('--theme-accent', settings.accentColor);
    document.documentElement.style.setProperty('--theme-overlay-opacity', settings.overlayOpacity.toString());
    
    if (settings.wallpaperPath) {
      const wp = settings.wallpaperPath;
      const formattedPath = wp.startsWith('file://')
        ? wp
        : `file:///${wp.replace(/\\/g, '/')}`;
      document.documentElement.style.setProperty('--theme-wallpaper', `url('${formattedPath}')`);
    } else {
      document.documentElement.style.removeProperty('--theme-wallpaper');
    }
    
    if (prevTmdbKeyRef.current !== settings.customTmdbApiKey) {
      clearTmdbCaches();
      invalidateTmdbSession();
      setTmdbCacheTick((t) => t + 1);
      prevTmdbKeyRef.current = settings.customTmdbApiKey;
    }

    saveSettings(settings);
    window.electronAPI?.setAppIcon?.('default');
  }, [settings]);

  useEffect(() => {
    window.electronAPI?.updateLibraryWatch?.([
      ...settings.movieFolders,
      ...settings.tvFolders,
    ]);
  }, [settings.movieFolders, settings.tvFolders]);

  const refreshVideoFromLibrary = (file: LocalFile): LocalFile => {
    const meta = resolveFileMeta(
      {
        name: file.name,
        path: file.path,
        localNfoContent: file.localNfoContent,
      },
      file.category,
    );
    const { tmdbDisabled: _removed, ...rest } = file;
    return applyMediaOverride({ ...rest, meta });
  };

  const handleUpdateVideo = (path: string, override: MediaOverride) => {
    const previous = files.find((f) => f.path === path) ?? infoVideo;
    const prevLookup = previous ? getTMDBLookupOptions(previous) : undefined;

    saveMediaOverride(path, override);
    setOverrideTick((t) => t + 1);

    const affectsTmdb =
      'tmdbId' in override ||
      'title' in override ||
      'year' in override ||
      'disableTmdb' in override;

    setFiles((prev) =>
      prev.map((f) => {
        if (f.path !== path) return f;
        const updated = applyMediaOverride(f);
        invalidateTmdbForVideo(updated, prevLookup);
        return updated;
      }),
    );

    setInfoVideo((prev) => {
      if (prev?.path !== path) return prev;
      const updated = applyMediaOverride(prev);
      invalidateTmdbForVideo(updated, prevLookup);
      return updated;
    });

    if (affectsTmdb) setTmdbCacheTick((t) => t + 1);
  };

  const handleResetVideo = (path: string) => {
    const previous = files.find((f) => f.path === path) ?? infoVideo;
    const prevLookup = previous ? getTMDBLookupOptions(previous) : undefined;

    clearMediaOverride(path);
    setOverrideTick((t) => t + 1);
    setTmdbCacheTick((t) => t + 1);

    const resetOne = (f: LocalFile): LocalFile => {
      if (f.path !== path) return f;
      const refreshed = refreshVideoFromLibrary(f);
      invalidateTmdbForVideo(refreshed, prevLookup);
      return refreshed;
    };

    setFiles((prev) => prev.map(resetOne));
    setInfoVideo((prev) => (prev?.path === path ? resetOne(prev) : prev));
  };

  const handleEpisodeEnriched = useCallback((batch: LocalFile[]) => {
    setFiles((prev) => mergeEnrichedFiles(prev, batch));
    setInfoVideo((prev) => {
      if (!prev?.isFolder || !prev.folderFiles) return prev;
      const updates = new Map(batch.map((f) => [f.path, f]));
      const folderFiles = prev.folderFiles.map((f) => updates.get(f.path) ?? f);
      return { ...prev, folderFiles };
    });
  }, []);

  const scanLibrary = useCallback(async (incremental = false) => {
    const hasFolders = settings.movieFolders.length > 0 || settings.tvFolders.length > 0;
    if (!hasFolders) return;

    if (!window.electronAPI) {
      alert("Run this inside Electron!");
      return;
    }

    const execute = async () => {
      setLoading(true);
      setLibrarySyncing(true);
      const gen = ++enrichGenRef.current;

      try {
        const { basicFiles, enrichQueue } = await scanAllFolders(settings);
        const priorityPaths = getInProgressPaths(activeProfileRef.current);

        if (incremental) {
          setFiles((prev) => {
            const diff = diffLibrary(prev, basicFiles);
            if (diff.added.length === 0 && diff.removedPaths.length === 0) {
              return prev;
            }
            pruneRemovedPaths(diff.removedPaths);
            const merged = mergeLibrarySync(prev, diff.added, diff.removedPaths);
            const addedPaths = new Set(diff.added.map((f) => f.path));
            const newEnrichQueue = enrichQueue.filter((item) => addedPaths.has(item.file.path));
            const optimized = buildOptimizedEnrichQueue(newEnrichQueue, priorityPaths, merged);
            if (optimized.length > 0) {
              enrichLibraryInBackground(optimized, (batch) => {
                if (gen !== enrichGenRef.current) return;
                setFiles((current) => mergeEnrichedFiles(current, batch));
              }).catch((err) => console.error('Background enrich failed:', err));
            }
            return merged;
          });
        } else {
          setFiles(basicFiles);
          const optimized = buildOptimizedEnrichQueue(enrichQueue, priorityPaths, basicFiles);
          enrichLibraryInBackground(optimized, (batch) => {
            if (gen !== enrichGenRef.current) return;
            setFiles((prev) => mergeEnrichedFiles(prev, batch));
          }).catch((err) => console.error('Background enrich failed:', err));
        }
      } catch (err) {
        console.error(err);
        if (!incremental) setFiles([]);
      } finally {
        setLoading(false);
        setLibrarySyncing(false);
      }
    };

    if (incremental) return execute();
    const folderKey = settings.movieFolders.join('\0') + '\0' + settings.tvFolders.join('\0');
    return runInitialScanOnce(folderKey, execute);
  }, [settings]);

  const openLibrarySettings = () => {
    setSettingsTab('library');
    setShowSettings(true);
  };

  const hasLibrary = settings.movieFolders.length > 0 || settings.tvFolders.length > 0;
  const libraryFolderKey = settings.movieFolders.join('\0') + '\0' + settings.tvFolders.join('\0');
  const loadedLibraryKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasLibrary) {
      setFiles([]);
      loadedLibraryKeyRef.current = null;
      resetScanSession();
      return;
    }

    // Scan once per folder configuration; start before profile pick so thumbnails load in background
    if (loadedLibraryKeyRef.current === libraryFolderKey) return;
    loadedLibraryKeyRef.current = libraryFolderKey;
    enrichGenRef.current += 1;
    scanLibrary(false);
  }, [libraryFolderKey, hasLibrary, scanLibrary]);

  useEffect(() => {
    if (!window.electronAPI?.onLibraryChanged) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    return window.electronAPI.onLibraryChanged(() => {
      if (!settings.autoSyncLibrary) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => scanLibrary(true), 500);
    });
  }, [settings.autoSyncLibrary, scanLibrary]);

  const playInExternal = (video: LocalFile) => {
    if (settings.externalPlayerPath && window.electronAPI?.playInExternalPlayer) {
      window.electronAPI.playInExternalPlayer(settings.externalPlayerPath, video.path);
      return true;
    }
    return false;
  };

  const getNextEpisode = (currentVideo: LocalFile | null): LocalFile | null => {
    if (!currentVideo || currentVideo.category !== 'tv') return null;

    const match = currentVideo.name.match(/(.*?)(s\d+e)(\d+)/i);
    if (match) {
      const [, prefix, s_e, epDigits] = match;
      const nextEpStr = (parseInt(epDigits, 10) + 1).toString().padStart(epDigits.length, '0');
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nextRegex = new RegExp(`^${escapedPrefix}${s_e}${nextEpStr}(?!\\d)`, 'i');
      const next = files.find(f => nextRegex.test(f.name));
      if (next) return next;
    }

    // Fallback: next file in the same folder, in natural sort order
    const dir = currentVideo.path.replace(/[\\/][^\\/]*$/, '');
    const siblings = files
      .filter(f => !f.isFolder && f.category === 'tv' && f.path.replace(/[\\/][^\\/]*$/, '') === dir)
      .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }));
    const index = siblings.findIndex(f => f.path === currentVideo.path);
    return index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  };

  const episodeLabel = (video: LocalFile) => {
    const m = video.name.match(/s(\d+)e(\d+)/i);
    return m ? `S${parseInt(m[1], 10)}:E${parseInt(m[2], 10)}` : undefined;
  };

  const buildSession = (video: LocalFile): PlayerSession | null => {
    if (!activeProfile) return null;
    const progress = JSON.parse(localStorage.getItem(`netflix_progress_${activeProfile}`) || '{}');
    let startTime = progress[video.path] || 0;
    // Restart finished items from the beginning
    if (video.duration && startTime > video.duration - 30) startTime = 0;
    const next = getNextEpisode(video);
    return {
      path: video.path,
      title: video.meta?.title || video.name,
      subtitle: episodeLabel(video),
      profileId: activeProfile,
      startTime,
      next: next ? { path: next.path, title: next.meta?.title || next.name, subtitle: episodeLabel(next) } : null,
      appName: settings.appName,
    };
  };

  const handlePlayVideo = (video: LocalFile) => {
    const target = resolvePlayTarget(video);
    if (activeProfile) {
      const counts = JSON.parse(localStorage.getItem(`netflix_playcounts_${activeProfile}`) || '{}');
      counts[target.path] = (counts[target.path] || 0) + 1;
      localStorage.setItem(`netflix_playcounts_${activeProfile}`, JSON.stringify(counts));
    }

    if (settings.useExternalPlayer && playInExternal(target)) return;

    const session = buildSession(target);
    if (!session || !window.electronAPI?.playerStart) return;
    setPlayingVideo(target);
    window.electronAPI.playerStart(session);
  };

  // Keep handlers fresh for the IPC listeners below without re-subscribing
  const playerHandlersRef = useRef({ handlePlayVideo, getNextEpisode, files });
  playerHandlersRef.current = { handlePlayVideo, getNextEpisode, files };

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onPlayerExited) return;

    const offExited = api.onPlayerExited((payload) => {
      setPlayingVideo(null);
      if (activeProfile) {
        setProgresses(JSON.parse(localStorage.getItem(`netflix_progress_${activeProfile}`) || '{}'));
        if (payload?.duration && payload.duration > 0 && payload.position / payload.duration >= 0.9) {
          setManualWatched(activeProfile, payload.path, true);
          setWatchedTick((t) => t + 1);
        }
      }
    });

    const offNext = api.onPlayerRequestNext((currentPath) => {
      const { files: list, getNextEpisode: findNext, handlePlayVideo: play } = playerHandlersRef.current;
      const current = list.find(f => f.path === currentPath) ?? null;
      const next = findNext(current);
      if (next) play(next);
    });

    return () => { offExited(); offNext(); };
  }, [activeProfile]);

  // Grouping for rows
  const {
    movies,
    folders,
    top10,
    continueWatchingAll,
    continueWatchingMovies,
    continueWatchingTv,
    movieGenreRows,
    tvGenreRows,
    searchCatalog,
    heroCatalog,
  } = useMemo(() => {
    const shows = files.filter(f => f.category === 'tv');
    const movies = files.filter(f => f.category === 'movie');
    const folders = buildSeriesFolders(shows);

    const playCounts = JSON.parse(localStorage.getItem(`netflix_playcounts_${activeProfile}`) || '{}');
    const top10 = buildTop10(movies, shows, playCounts, folders);
    const continueWatchingMovies = buildContinueWatchingMovies(movies, progresses);
    const continueWatchingTv = buildContinueWatchingSeries(shows, progresses, folders);
    const continueWatchingAll = buildContinueWatchingAll(movies, shows, progresses, folders);
    const movieGenreRows = buildGenreRows(movies);
    const tvGenreRows = buildGenreRows(folders);
    const searchCatalog = buildSearchCatalog(movies, folders);
    const heroCatalog = buildHeroCatalog(movies, folders);

    return {
      movies,
      folders,
      top10,
      continueWatchingAll,
      continueWatchingMovies,
      continueWatchingTv,
      movieGenreRows,
      tvGenreRows,
      searchCatalog,
      heroCatalog,
    };
  }, [files, progresses, activeProfile, overrideTick, tmdbCacheTick]);

  // Dynamic Hero Banner
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [delayOver, setDelayOver] = useState(false);
  const [isHeroMuted, setIsHeroMuted] = useState(true);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  
  const featured = heroCatalog.length > 0 ? heroCatalog[featuredIndex % heroCatalog.length] : null;
  const featuredLocalOnly = isTmdbDisabled(featured);
  const featuredTmdb = useTMDB(featured);
  const featuredPlayTarget = featured ? resolvePlayTarget(featured) : null;
  const featuredImageSrc = featured
    ? (tmdbArtwork(featuredLocalOnly ? null : featuredTmdb, featured) || featured.localFanart || featured.localPoster || featured.thumbnail)
    : undefined;

  useEffect(() => {
    if (files.length === 0 || loading || librarySyncing) return;

    const movies = files.filter((f) => f.category === 'movie');
    const seriesFolders = buildSeriesFolders(files.filter((f) => f.category === 'tv'));
    const priority = [...heroCatalog, ...top10, ...continueWatchingAll];
    const gen = ++tmdbPrefetchGenRef.current;

    const timer = setTimeout(async () => {
      if (gen !== tmdbPrefetchGenRef.current) return;
      prefetchTMDBCatalog([...movies, ...seriesFolders], priority, 80);
      await new Promise((r) => setTimeout(r, 4000));
      if (gen !== tmdbPrefetchGenRef.current) return;
      await prefetchTMDBDetailsCatalog([...movies, ...seriesFolders], priority, 40);
      if (gen === tmdbPrefetchGenRef.current) {
        setTmdbCacheTick((t) => t + 1);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [files.length, libraryFolderKey, loading, librarySyncing, heroCatalog, top10, continueWatchingAll]);

  // 1. Initial 3s delay on image
  useEffect(() => {
    if (!featured) return;
    
    setDelayOver(false);
    setIsVideoPlaying(false);
    
    const t = setTimeout(() => {
      setDelayOver(true);
    }, 3000);
    
    return () => clearTimeout(t);
  }, [featuredIndex, heroCatalog.length, featured?.path]);

  // 2. Play when mounted
  useEffect(() => {
    if (delayOver && heroVideoRef.current) {
      heroVideoRef.current.play().catch(e => {
        console.error("Play failed:", e);
      });
    }
  }, [delayOver]);

  const handleHeroTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    
    // Safety fallback: if video is advancing, it is playing
    if (video.currentTime > 0.1 && !isVideoPlaying) {
      setIsVideoPlaying(true);
    }
    
    if (video.currentTime >= 15) {
      // End of preview
      setDelayOver(false);
      setIsVideoPlaying(false);
      
      // Wait 5s on image, then cycle
      setTimeout(() => {
        setFeaturedIndex((prev) => (prev + 1) % heroCatalog.length);
      }, 5000);
    }
  };


  return (
    // @ts-ignore - zoom works in electron
    <div 
      className="text-white selection:bg-accent selection:text-white pb-20 flex flex-col min-h-screen bg-[#141414] overflow-x-hidden relative" 
      style={{ zoom: settings.uiScale, minHeight: `${100 / settings.uiScale}vh` }}
    >
      
      {/* Startup Screen */}
      {showStartup && (
        <StartupScreen 
          onComplete={handleStartupComplete}
          appName={settings.appName} 
          accentColor={settings.accentColor} 
        />
      )}

      {/* Profiles Screen */}
      {!showStartup && !activeProfile && (
        <ProfilesScreen
          onSelect={setActiveProfile}
          skipProfilePicker={settings.skipProfilePicker}
          defaultProfileId={settings.defaultProfileId}
          onProfileSettingsChange={(update) => setSettings(prev => ({ ...prev, ...update }))}
        />
      )}

      {/* Main App Body (Only render if profile selected) */}
      {activeProfile && (
        <>
          {/* Top Navbar */}
            <nav 
              className="fixed top-0 w-full z-50 bg-gradient-to-b from-black/90 via-black/50 to-transparent px-10 py-4 flex items-center justify-between pointer-events-none transition-all duration-300 origin-top"
              style={{ WebkitAppRegion: 'drag', zoom: 1.15 } as any}
            >
              <div className="flex items-center gap-8" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <h1 className="text-accent font-black text-2xl tracking-tighter pointer-events-auto shadow-black drop-shadow-md">{settings.appName}</h1>
                <ul className="hidden md:flex gap-5 text-sm font-semibold text-gray-200 pointer-events-auto">
                  <li onClick={() => { setShowSearch(false); setActiveTab('home'); }} className={`drop-shadow-md cursor-pointer transition ${activeTab === 'home' && !showSearch ? 'text-white' : 'hover:text-gray-300'}`}>Home</li>
                  <li onClick={() => { setShowSearch(false); setActiveTab('tv'); }} className={`drop-shadow-md cursor-pointer transition ${activeTab === 'tv' && !showSearch ? 'text-white' : 'hover:text-gray-300'}`}>TV Shows</li>
                  <li onClick={() => { setShowSearch(false); setActiveTab('movies'); }} className={`drop-shadow-md cursor-pointer transition ${activeTab === 'movies' && !showSearch ? 'text-white' : 'hover:text-gray-300'}`}>Movies</li>
                </ul>
              </div>
            
            <div className="pointer-events-auto flex items-center gap-6 pr-40" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <button
                onClick={() => setShowSearch((s) => !s)}
                className={`flex items-center group relative p-1 hover:bg-white/10 rounded-full transition ${showSearch ? 'bg-white/10' : ''}`}
                aria-label="Search library"
              >
                <Search className="w-5 h-5 text-white" />
              </button>
              {settings.compactLibraryButton ? (
                <button
                  onClick={openLibrarySettings}
                  className="p-2 hover:bg-white/10 rounded-full transition"
                  aria-label={hasLibrary ? 'Manage library' : 'Select library'}
                >
                  <FolderSearch className="w-5 h-5 text-white" />
                </button>
              ) : (
                <div className="flex items-center bg-black/50 border border-white/20 rounded px-2 hover:bg-white/10 transition cursor-pointer" onClick={openLibrarySettings}>
                  <FolderSearch className="w-4 h-4 text-gray-400 mr-2" />
                  <button className="bg-transparent text-xs text-white py-2 outline-none">
                    {hasLibrary ? 'Manage Library' : 'Select Library'}
                  </button>
                </div>
              )}
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-white/10 rounded-full transition"
              >
                <SettingsIcon className="w-5 h-5 text-white" />
              </button>
              {/* Profile Switcher */}
              <button 
                onClick={() => setActiveProfile(null)}
                className="p-1 hover:bg-white/10 rounded transition"
                aria-label="Switch profile"
              >
                <img 
                  src={
                    (() => {
                      const p = JSON.parse(localStorage.getItem('netflix_profiles') || '[]').find((p: any) => p.id === activeProfile);
                      if (!p || p.avatar.includes('api.dicebear.com') || p.avatar.includes('./avatars/avatar')) return './avatars/key1.jpg';
                      return p.avatar;
                    })()
                  } 
                  className="w-8 h-8 rounded object-cover border border-gray-700" 
                  alt="Profile" 
                />
              </button>
            </div>
          </nav>

      {!hasLibrary ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center px-4 relative z-10 pt-20">
          <h2 className="text-2xl font-bold mb-2">Set up your library</h2>
          <p className="text-gray-400 mb-6 max-w-md">Choose one or more folders for movies and TV shows. You can pick different folders for each section.</p>
          <button 
            onClick={openLibrarySettings}
            className="mt-2 flex items-center justify-center gap-2 bg-accent text-white px-8 py-4 rounded font-bold text-xl hover:bg-red-700 transition shadow-lg hover:scale-105 active:scale-95"
          >
            <FolderSearch className="w-6 h-6" />
            Select Library Folders
          </button>
        </div>
      ) : loading ? (
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-accent border-solid shadow-lg"></div>
        </div>
      ) : files.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center px-4 relative z-10 pt-20">
          <div className="w-24 h-24 mb-6 rounded-full bg-gray-800 flex items-center justify-center">
            <Search className="w-10 h-10 text-gray-500" />
          </div>
          <h2 className="text-3xl font-bold mb-2">No videos found</h2>
          <p className="text-gray-400 mb-8 max-w-md">
            We couldn't find any supported video files (.mp4, .mkv, .avi, etc.) in your selected folders.
          </p>
          <button 
            onClick={openLibrarySettings}
            className="border border-white/20 hover:bg-white/10 text-white px-6 py-2 rounded font-semibold transition"
          >
            Manage library folders
          </button>
        </div>
      ) : (
        <>
          {/* Hero Banner with Ken Burns — hidden while search is open */}
          {featured && !showSearch && (
            <div className="relative w-full overflow-hidden" style={{ height: `${85 / settings.uiScale}vh` }}>
                  {/* Image and Video Wrapper */}
                  <div className="absolute inset-0 w-full h-full bg-gray-900">
                    {/* Static Image */}
                    <div 
                      className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${isVideoPlaying ? 'opacity-0' : 'opacity-100'}`}
                    >
                      {featuredImageSrc ? (
                        <img 
                          src={featuredImageSrc} 
                          alt={featured.meta?.title || featured.name}
                          className="w-full h-full object-cover opacity-80 animate-ken-burns scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-gray-900 to-gray-800" />
                      )}
                    </div>
  
                    {/* Video Preview */}
                    <div 
                      className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${isVideoPlaying ? 'opacity-100' : 'opacity-0'}`}
                    >
                      {delayOver && !playingVideo && featuredPlayTarget && (
                        <video
                          ref={heroVideoRef}
                          src={`file:///${featuredPlayTarget.path.replace(/\\/g, '/')}`}
                          autoPlay
                          muted={isHeroMuted}
                          onPlay={() => setIsVideoPlaying(true)}
                          onTimeUpdate={handleHeroTimeUpdate}
                          onEnded={() => setIsVideoPlaying(false)}
                          className="w-full h-full object-cover opacity-80"
                        />
                      )}
                    </div>
                  </div>
              
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
              
                <div className="absolute bottom-[25%] left-10 right-10 z-10 flex justify-between items-end">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={featured.path}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5 }}
                      className="max-w-2xl"
                    >
                      <h1 className="text-5xl md:text-7xl font-bold mb-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                        {featured.meta?.title || featured.name}
                      </h1>
                      <p className="text-lg md:text-xl text-gray-200 mb-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-3 font-medium">
                        {(featuredLocalOnly ? featured.meta?.description : (featuredTmdb?.synopsis || featured.meta?.description)) || 'A local media file from your personal collection.'}
                      </p>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => handlePlayVideo(featured)}
                          className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded text-xl font-bold hover:bg-white/80 transition"
                        >
                          <Play className="w-7 h-7 fill-black" /> Play
                        </button>
                        <button 
                          onClick={() => setInfoVideo(featured)}
                          className="flex items-center gap-2 bg-gray-500/70 text-white px-8 py-3 rounded text-xl font-bold hover:bg-gray-500/50 transition"
                        >
                          <Info className="w-7 h-7" /> More Info
                        </button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                  
                  {/* Mute Toggle Button */}
                  <button 
                    onClick={() => setIsHeroMuted(!isHeroMuted)}
                    className="p-3 border rounded-full border-gray-400 bg-black/40 hover:bg-white/20 transition text-white mb-8"
                  >
                    {isHeroMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                  </button>
                </div>
            </div>
          )}

          {/* Carousel Rows — hidden while search is open */}
          <div className={`px-2 relative z-10 flex-grow pb-20 ${showSearch ? 'hidden' : featured ? '-mt-32' : ''}`}>
            {activeTab === 'home' && top10.length > 0 && (
              <ContentRow title="Top 10 in Your House Today" videos={top10} onPlay={handlePlayVideo} onInfo={setInfoVideo} isTop10={true} activeProfileId={activeProfile} watchedIndicatorMode={settings.watchedIndicatorMode} />
            )}
            {activeTab === 'home' && continueWatchingAll.length > 0 && (
              <ContentRow title="Continue Watching" videos={continueWatchingAll} onPlay={handlePlayVideo} onInfo={setInfoVideo} progresses={progresses} activeProfileId={activeProfile} watchedIndicatorMode={settings.watchedIndicatorMode} />
            )}
            {activeTab === 'tv' && continueWatchingTv.length > 0 && (
              <ContentRow title="Continue Watching" videos={continueWatchingTv} onPlay={handlePlayVideo} onInfo={setInfoVideo} progresses={progresses} activeProfileId={activeProfile} watchedIndicatorMode={settings.watchedIndicatorMode} />
            )}
            {(activeTab === 'home' || activeTab === 'movies') && continueWatchingMovies.length > 0 && (
              <ContentRow title="Continue Watching" videos={continueWatchingMovies} onPlay={handlePlayVideo} onInfo={setInfoVideo} progresses={progresses} activeProfileId={activeProfile} watchedIndicatorMode={settings.watchedIndicatorMode} />
            )}
            
            {activeTab === 'home' && heroCatalog.length > 0 && (
              <ContentRow title="Home" videos={heroCatalog} onPlay={handlePlayVideo} onInfo={setInfoVideo} progresses={progresses} expandable activeProfileId={activeProfile} watchedIndicatorMode={settings.watchedIndicatorMode} />
            )}
            
            {(activeTab === 'home' || activeTab === 'tv') && folders.length > 0 && (
              <ContentRow title="Series" videos={folders} onPlay={handlePlayVideo} onInfo={setInfoVideo} progresses={progresses} expandable activeProfileId={activeProfile} watchedIndicatorMode={settings.watchedIndicatorMode} />
            )}
            
            {(activeTab === 'home' || activeTab === 'movies') && movies.length > 0 && (
              <ContentRow title="Movies" videos={movies} onPlay={handlePlayVideo} onInfo={setInfoVideo} progresses={progresses} expandable activeProfileId={activeProfile} watchedIndicatorMode={settings.watchedIndicatorMode} />
            )}

            {activeTab === 'movies' && movieGenreRows.map((row) => (
              <ContentRow
                key={`movie-genre-${row.title}`}
                title={row.title}
                videos={row.videos}
                onPlay={handlePlayVideo}
                onInfo={setInfoVideo}
                progresses={progresses}
                expandable
                activeProfileId={activeProfile}
                watchedIndicatorMode={settings.watchedIndicatorMode}
              />
            ))}

            {activeTab === 'tv' && tvGenreRows.map((row) => (
              <ContentRow
                key={`tv-genre-${row.title}`}
                title={row.title}
                videos={row.videos}
                onPlay={handlePlayVideo}
                onInfo={setInfoVideo}
                progresses={progresses}
                expandable
                activeProfileId={activeProfile}
                watchedIndicatorMode={settings.watchedIndicatorMode}
              />
            ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {infoVideo && (
        <DetailModal
          key={infoVideo.path}
          video={infoVideo}
          watchedRevision={watchedTick}
          onClose={() => setInfoVideo(null)}
          onPlay={(v) => { setInfoVideo(null); handlePlayVideo(v); }}
          onUpdate={handleUpdateVideo}
          onReset={handleResetVideo}
          onEpisodeEnriched={handleEpisodeEnriched}
          progresses={progresses}
          activeProfileId={activeProfile}
          onWatchedChange={handleWatchedChange}
          watchedIndicatorMode={settings.watchedIndicatorMode}
        />
      )}

      {/* Backdrop while the player windows sit on top; the top strip stays draggable */}
      {playingVideo && (
        <div className="fixed inset-0 z-[1000] bg-black">
          <div
            className="h-8 flex items-center px-4 text-xs text-white/50 truncate pr-40"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            {settings.appName} · {playingVideo.meta?.title || playingVideo.name}
          </div>
        </div>
      )}
        </>
      )}

      {/* Search Overlay */}
      {showSearch && activeProfile && (
        <SearchOverlay
          files={searchCatalog}
          onClose={() => setShowSearch(false)}
          onPlay={handlePlayVideo}
          onInfo={setInfoVideo}
          progresses={progresses}
          activeProfileId={activeProfile}
          watchedIndicatorMode={settings.watchedIndicatorMode}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          currentSettings={settings}
          initialTab={settingsTab}
          appUpdateInfo={appUpdateInfo}
          onScanLibrary={() => scanLibrary(true)}
          librarySyncing={librarySyncing}
          onSave={(newSettings) => {
            setSettings(newSettings);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Global Styles */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes kenBurns {
          0% { transform: scale(1.1); }
          50% { transform: scale(1.15) translate(-1%, -1%); }
          100% { transform: scale(1.1); }
        }
        .animate-ken-burns {
          animation: kenBurns 20s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
}
