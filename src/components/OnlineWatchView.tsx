import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Play,
  X,
  Loader2,
  Flame,
  Film,
  Music,
  Gamepad2,
  Compass,
  Check,
  Copy,
  ExternalLink,
  Tv,
} from 'lucide-react';

interface OnlineWatchViewProps {
  onPlayVideo: (video: OnlineVideo) => void;
  accentColor?: string;
}

const CATEGORIES = [
  { label: 'Trending', query: 'trending trailers and highlights', icon: Flame },
  { label: 'Movie Trailers', query: 'official movie trailers 2026', icon: Film },
  { label: 'Anime Openings', query: 'popular anime openings ost', icon: Tv },
  { label: 'Music', query: 'top music hits official music video', icon: Music },
  { label: 'Gaming', query: 'gameplay trailer highlights', icon: Gamepad2 },
  { label: 'Documentaries', query: 'documentary full film nature science', icon: Compass },
];

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViews(views: number | null): string {
  if (views === null || views === undefined) return '';
  if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B views`;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} views`;
}

export function OnlineWatchView({ onPlayVideo, accentColor }: OnlineWatchViewProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Trending');
  const [results, setResults] = useState<OnlineVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchGenRef = useRef(0);

  const performSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    const gen = ++searchGenRef.current;
    setLoading(true);
    setError(null);

    try {
      const searchFn = window.electronAPI?.searchOnline;
      if (!searchFn) {
        setError('Online search service is not available.');
        setLoading(false);
        return;
      }

      const res = await searchFn(trimmed);
      if (gen !== searchGenRef.current) return;

      if (!res.ok) {
        setError(res.error || 'Failed to search YouTube. Please try again.');
        setResults([]);
      } else {
        setResults(res.results || []);
      }
    } catch (err: any) {
      if (gen !== searchGenRef.current) return;
      setError(err?.message || 'An unexpected error occurred during search.');
      setResults([]);
    } finally {
      if (gen === searchGenRef.current) {
        setLoading(false);
      }
    }
  };

  // Initial trending search on mount
  useEffect(() => {
    const initialCategory = CATEGORIES[0];
    performSearch(initialCategory.query);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setActiveCategory('');
    performSearch(query);
  };

  const handleCategoryClick = (cat: typeof CATEGORIES[0]) => {
    setActiveCategory(cat.label);
    setQuery('');
    performSearch(cat.query);
  };

  const handleCopyLink = (e: React.MouseEvent, video: OnlineVideo) => {
    e.stopPropagation();
    if (!video.url) return;
    navigator.clipboard.writeText(video.url);
    setCopiedId(video.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const activeColor = accentColor || '#E50914';

  return (
    <div className="min-h-screen pt-24 px-6 md:px-12 pb-20 text-white animate-fade-in">
      {/* Header & Search Bar */}
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 drop-shadow-md">
          Watch Online
        </h2>
        <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto mb-6">
          Search YouTube videos or paste direct links. Streams directly in Kudflix with native mpv and Discord Rich Presence.
        </p>

        {/* Input bar */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto mb-6">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search videos, music, channels or paste YouTube URL..."
              className="w-full bg-zinc-900/90 text-white placeholder-gray-500 pl-12 pr-28 py-3.5 rounded-full border border-white/10 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-2xl text-sm md:text-base transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-20 text-gray-400 hover:text-white p-1 transition"
                aria-label="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{ backgroundColor: activeColor }}
              className="absolute right-1.5 px-4 py-2 rounded-full text-xs md:text-sm font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </div>
        </form>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.label && !query;
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-white text-black font-semibold shadow-lg scale-105'
                    : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-gray-300 hover:text-white border border-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-black' : 'text-gray-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        <div className="max-w-md mx-auto text-center py-16 px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/30 border border-red-500/30 flex items-center justify-center text-red-400">
            <X className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-2">Search failed</h3>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => performSearch(query || CATEGORIES[0].query)}
            className="px-6 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-sm transition"
          >
            Try Again
          </button>
        </div>
      ) : loading && results.length === 0 ? (
        /* Shimmer Loading Skeletons */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-zinc-900/50 rounded-lg overflow-hidden border border-white/5 animate-pulse"
            >
              <div className="aspect-video bg-zinc-800 w-full" />
              <div className="p-3.5 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-5/6" />
                <div className="h-3 bg-zinc-800/70 rounded w-1/2" />
                <div className="h-3 bg-zinc-800/50 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 && !loading ? (
        <div className="text-center py-20 text-gray-400">
          <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium">No video results found</p>
          <p className="text-xs text-gray-500 mt-1">Try another keyword or paste a full YouTube URL</p>
        </div>
      ) : (
        /* Results Grid */
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-200">
              {activeCategory ? `${activeCategory} Videos` : `Results for "${query}"`}
            </h3>
            <span className="text-xs text-gray-400">
              {results.length} {results.length === 1 ? 'video' : 'videos'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {results.map((video) => {
              const durationStr = formatDuration(video.duration);
              const viewsStr = formatViews(video.viewCount);
              const isCopied = copiedId === video.id;

              return (
                <div
                  key={video.id}
                  onClick={() => onPlayVideo(video)}
                  className="group relative bg-zinc-900/80 hover:bg-zinc-800/90 rounded-lg overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-300 shadow-md hover:shadow-2xl hover:scale-[1.03] cursor-pointer flex flex-col"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          // Fallback to hqdefault
                          const target = e.currentTarget;
                          if (!target.src.includes('hqdefault.jpg')) {
                            target.src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-gray-600">
                        <Film className="w-10 h-10" />
                      </div>
                    )}

                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div
                        style={{ backgroundColor: activeColor }}
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300"
                      >
                        <Play className="w-6 h-6 fill-white translate-x-0.5" />
                      </div>
                    </div>

                    {/* Duration badge */}
                    {durationStr && (
                      <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded backdrop-blur-sm">
                        {durationStr}
                      </span>
                    )}
                  </div>

                  {/* Video Meta */}
                  <div className="p-3.5 flex flex-col flex-grow justify-between">
                    <div>
                      <h4
                        className="font-semibold text-sm leading-snug line-clamp-2 text-gray-100 group-hover:text-white mb-1.5 transition-colors"
                        title={video.title}
                      >
                        {video.title}
                      </h4>
                      <p className="text-xs text-gray-400 truncate mb-1" title={video.channel}>
                        {video.channel}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-white/5 mt-auto">
                      <span>{viewsStr || 'YouTube'}</span>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(e, video)}
                          title="Copy YouTube Link"
                          className="p-1 hover:text-white rounded hover:bg-white/10 transition"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(video.url, '_blank');
                          }}
                          title="Open in Browser"
                          className="p-1 hover:text-white rounded hover:bg-white/10 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
