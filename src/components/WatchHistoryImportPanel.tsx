import { useMemo, useRef, useState, type MouseEvent } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import type { LocalFile } from './NetflixUI';
import {
  collectWatchHistoryCandidates,
  groupCandidatesBySeries,
  type CandidateStatus,
  type WatchHistoryCandidate,
} from '../utils/watchHistoryCandidates';
import { appendWatchHistoryBulk, appendWatchHistoryManual } from '../utils/watchHistory';
import { getLibraryDisplayTitle } from '../utils/displayTitle';
import { episodeCodeFromFile } from '../utils/watchHistory';
import { formatDurationShort } from '../utils/subtitles';

type Filter = 'all' | CandidateStatus;

function CandidateRow({
  candidate,
  selected,
  onToggle,
  onAddOne,
}: {
  candidate: WatchHistoryCandidate;
  selected: boolean;
  onToggle: (e: MouseEvent) => void;
  onAddOne: () => void;
}) {
  const title =
    candidate.video.category === 'tv'
      ? getLibraryDisplayTitle(candidate.video)
      : candidate.video.meta?.title || candidate.video.name;
  const code = episodeCodeFromFile(candidate.video);
  const progress =
    candidate.duration > 0
      ? `${formatDurationShort(candidate.position)} / ${formatDurationShort(candidate.duration)}`
      : candidate.position > 0
        ? formatDurationShort(candidate.position)
        : null;

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/5 transition group">
      <button
        type="button"
        onClick={(e) => onToggle(e)}
        className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition ${
          selected ? 'bg-accent border-accent text-white' : 'border-gray-600 hover:border-gray-400'
        }`}
        aria-pressed={selected}
      >
        {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {code ? `${code} · ${title}` : title}
        </p>
        <p className="text-xs text-gray-500">
          {candidate.status === 'watched' ? 'Watched' : 'Partially watched'}
          {progress ? ` · ${progress}` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={onAddOne}
        className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
        title="Add this title only"
        aria-label="Add to history"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

export function WatchHistoryImportPanel({
  profileId,
  files,
  progresses,
  onBack,
}: {
  profileId: string;
  files: LocalFile[];
  progresses: Record<string, number>;
  onBack: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const selectionAnchorRef = useRef<string | null>(null);

  const allCandidates = useMemo(
    () => collectWatchHistoryCandidates(files, progresses, profileId),
    [files, progresses, profileId],
  );

  const filtered = useMemo(() => {
    let list = allCandidates;
    if (filter !== 'all') list = list.filter((c) => c.status === filter);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const title = (c.video.meta?.title || c.video.name).toLowerCase();
      const series = (c.seriesTitle ?? '').toLowerCase();
      return title.includes(q) || series.includes(q);
    });
  }, [allCandidates, filter, query]);

  const movies = useMemo(() => filtered.filter((c) => c.video.category !== 'tv'), [filtered]);
  const seriesGroups = useMemo(() => groupCandidatesBySeries(filtered), [filtered]);

  /** Movies first, then episodes per show, used for shift-click range select. */
  const orderedPaths = useMemo(() => {
    const paths: string[] = movies.map((c) => c.path);
    for (const group of seriesGroups) {
      for (const c of group.items) paths.push(c.path);
    }
    return paths;
  }, [movies, seriesGroups]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.path));

  const selectedCandidates = useMemo(
    () => allCandidates.filter((c) => selected.has(c.path)),
    [allCandidates, selected],
  );

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const togglePath = (path: string, shiftKey = false) => {
    if (shiftKey && selectionAnchorRef.current) {
      const anchor = selectionAnchorRef.current;
      const i = orderedPaths.indexOf(anchor);
      const j = orderedPaths.indexOf(path);
      if (i >= 0 && j >= 0) {
        const lo = Math.min(i, j);
        const hi = Math.max(i, j);
        setSelected((prev) => {
          const next = new Set(prev);
          for (let k = lo; k <= hi; k++) next.add(orderedPaths[k]!);
          return next;
        });
        selectionAnchorRef.current = path;
        return;
      }
    }

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
    selectionAnchorRef.current = path;
  };

  const toggleSelectAllFiltered = () => {
    const paths = filtered.map((c) => c.path);
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const p of paths) next.delete(p);
      } else {
        for (const p of paths) next.add(p);
      }
      return next;
    });
    if (!allFilteredSelected && paths.length > 0) {
      selectionAnchorRef.current = paths[paths.length - 1]!;
    }
  };

  const selectShow = (items: WatchHistoryCandidate[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of items) {
        if (on) next.add(c.path);
        else next.delete(c.path);
      }
      return next;
    });
  };

  const addCandidates = async (list: WatchHistoryCandidate[]) => {
    if (list.length === 0) return;
    setAdding(true);
    try {
      const n = await appendWatchHistoryBulk(
        profileId,
        list.map((c) => ({
          video: c.video,
          position: c.position,
          duration: c.duration,
          completed: c.completed,
        })),
      );
      showToast(`Added ${n} ${n === 1 ? 'entry' : 'entries'} to history`);
      setSelected((prev) => {
        const next = new Set(prev);
        for (const c of list) next.delete(c.path);
        return next;
      });
    } finally {
      setAdding(false);
    }
  };

  const addOne = async (c: WatchHistoryCandidate) => {
    await appendWatchHistoryManual(profileId, c.video, {
      position: c.position,
      duration: c.duration,
      completed: c.completed,
    });
    showToast('Added to history');
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(c.path);
      return next;
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-3 px-6 md:px-10 py-4 shrink-0 border-b border-gray-800/50">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
          aria-label="Back to history"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white">Add from library</h2>
          <p className="text-xs text-gray-500">Watched and partially watched titles</p>
        </div>
        {toast && <span className="text-sm text-green-400 font-medium shrink-0">{toast}</span>}
      </div>

      <div className="px-6 md:px-10 py-4 shrink-0 space-y-3 border-b border-gray-800/40">
        <div className="flex items-center gap-2 bg-[#181818] border border-gray-700 rounded-full px-4 py-2 max-w-md">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter titles…"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-gray-500 min-w-0"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'watched', 'partial'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                filter === f ? 'bg-white text-black' : 'bg-white/10 text-gray-300 hover:bg-white/15'
              }`}
            >
              {f === 'all' ? 'All' : f === 'watched' ? 'Watched' : 'Partial'}
            </button>
          ))}
          <span className="text-xs text-gray-500 self-center ml-2">{filtered.length} titles</span>
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition bg-white/10 text-gray-300 hover:bg-white/15 ml-auto"
            >
              {allFilteredSelected ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-28 min-h-0">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-center mt-12 max-w-md mx-auto">
            No watched or in-progress titles match. Mark items watched or play them partially first.
          </p>
        ) : (
          <div className="max-w-3xl mx-auto py-4 space-y-6">
            {movies.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 px-3">Movies</h3>
                <div className="rounded-lg border border-gray-800/80 divide-y divide-gray-800/60">
                  {movies.map((c) => (
                    <CandidateRow
                      key={c.path}
                      candidate={c}
                      selected={selected.has(c.path)}
                      onToggle={(e) => togglePath(c.path, e.shiftKey)}
                      onAddOne={() => void addOne(c)}
                    />
                  ))}
                </div>
              </section>
            )}

            {seriesGroups.length > 0 && (
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 px-3 pt-2">TV shows</h3>
            )}
            {seriesGroups.map((group) => {
              const open = expanded.has(group.key);
              const allSelected = group.items.every((c) => selected.has(c.path));
              const someSelected = group.items.some((c) => selected.has(c.path));
              return (
                <section key={group.key}>
                  <div className="flex items-center gap-2 mb-2 px-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(group.key)) next.delete(group.key);
                          else next.add(group.key);
                          return next;
                        })
                      }
                      className="p-1 text-gray-400 hover:text-white"
                      aria-expanded={open}
                    >
                      {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectShow(group.items, !allSelected)}
                      className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition ${
                        allSelected
                          ? 'bg-accent border-accent text-white'
                          : someSelected
                            ? 'border-accent bg-accent/30'
                            : 'border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {allSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                    </button>
                    <h3 className="text-sm font-bold text-white flex-1 truncate">{group.title}</h3>
                    <span className="text-xs text-gray-500">{group.items.length} eps</span>
                    <button
                      type="button"
                      onClick={() => void addCandidates(group.items)}
                      className="text-xs font-bold text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition"
                    >
                      Add show
                    </button>
                  </div>
                  {open && (
                    <div className="rounded-lg border border-gray-800/80 ml-6">
                      {group.items.map((c) => (
                        <CandidateRow
                          key={c.path}
                          candidate={c}
                          selected={selected.has(c.path)}
                          onToggle={(e) => togglePath(c.path, e.shiftKey)}
                          onAddOne={() => void addOne(c)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {selectedCandidates.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-t from-[#141414] via-[#141414] to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto flex justify-end">
            <button
              type="button"
              disabled={adding}
              onClick={() => void addCandidates(selectedCandidates)}
              className="px-6 py-3 rounded-lg font-bold text-sm bg-accent text-white hover:bg-red-700 transition disabled:opacity-50 shadow-lg"
            >
              Add {selectedCandidates.length} to history
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
