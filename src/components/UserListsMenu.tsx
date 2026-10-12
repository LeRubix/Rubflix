import { useState, useRef, useEffect, useLayoutEffect, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { BookmarkPlus, Check, ChevronDown, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUserLists } from '../hooks/useUserLists';
import {
  createList,
  isInList,
  listKindForVideo,
  toggleListItem,
  type ListKind,
} from '../utils/userLists';
import type { LocalFile } from './NetflixUI';

function ListsPopoverPanel({
  profileId,
  itemPath,
  kind,
  compact,
  onClose,
}: {
  profileId: string;
  itemPath: string;
  kind: ListKind;
  compact?: boolean;
  onClose: () => void;
}) {
  const lists = useUserLists(profileId);
  const matching = lists.filter((l) => l.kind === kind);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const list = createList(profileId, name, kind);
    if (list) {
      toggleListItem(profileId, list.id, itemPath);
      setNewName('');
      setCreating(false);
    }
  };

  const shell = compact
    ? 'rounded-lg border border-white/15 bg-[#2a2a2a] shadow-2xl overflow-hidden w-[min(280px,calc(100vw-24px))] min-w-[220px]'
    : 'rounded-lg border border-white/15 bg-[#2a2a2a] shadow-2xl overflow-hidden min-w-[240px] max-w-[320px]';

  const listScroll = compact
    ? 'max-h-[min(220px,40vh)] overflow-y-auto py-1'
    : 'max-h-[280px] overflow-y-auto py-1';
  const rowClass =
    'w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-white/10 transition';
  const labelClass = 'truncate font-semibold text-sm';
  const checkSize = 'w-5 h-5';
  const emptyClass = 'px-3 py-2.5 text-sm text-white/50';

  return (
    <div className={shell}>
      <div className={listScroll}>
        {matching.length === 0 && !creating && (
          <p className={emptyClass}>No {kind === 'movie' ? 'movie' : 'TV'} lists yet.</p>
        )}
        {matching.map((list) => {
          const checked = isInList(profileId, list.id, itemPath);
          return (
            <button
              key={list.id}
              type="button"
              onClick={() => toggleListItem(profileId, list.id, itemPath)}
              className={rowClass}
            >
              <span className="w-5 flex-shrink-0">
                {checked && <Check className={checkSize} strokeWidth={3} />}
              </span>
              <span className={labelClass}>{list.name}</span>
            </button>
          );
        })}
      </div>
      <div className="border-t border-white/10 p-2">
        {creating ? (
          <div className="flex gap-2 px-0.5">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setCreating(false);
                  onClose();
                }
              }}
              onKeyUp={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              placeholder="List name"
              maxLength={40}
              autoFocus
              className="flex-1 min-w-0 bg-black/40 border border-gray-600 rounded px-3 py-1.5 text-sm text-white outline-none focus:border-white"
            />
            <button
              type="button"
              onClick={handleCreate}
              className="px-3 py-1.5 rounded bg-white text-black text-sm font-bold hover:bg-white/90 shrink-0"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="w-full px-3 py-2 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/5 rounded transition text-left"
          >
            + New list…
          </button>
        )}
      </div>
    </div>
  );
}

const POPOVER_EST_HEIGHT = 300;
const POPOVER_WIDTH = 280;
const VIEWPORT_PAD = 12;

function computePopoverPosition(anchor: DOMRect, preferAbove: boolean) {
  let placeAbove = preferAbove;
  if (preferAbove && anchor.top < POPOVER_EST_HEIGHT + VIEWPORT_PAD) {
    placeAbove = false;
  }
  if (!placeAbove && anchor.bottom + POPOVER_EST_HEIGHT > window.innerHeight - VIEWPORT_PAD) {
    placeAbove = true;
  }

  let left = anchor.left;
  left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - POPOVER_WIDTH - VIEWPORT_PAD));

  if (placeAbove) {
    return { left, top: anchor.top - 8, transform: 'translateY(-100%)' as const };
  }
  return { left, top: anchor.bottom + 8, transform: undefined };
}

function PortalPopover({
  anchorRef,
  popoverRef,
  placement,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  placement: 'above' | 'below';
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ left: number; top: number; transform?: string } | null>(null);

  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const update = () => {
      setPos(computePopoverPosition(el.getBoundingClientRect(), placement === 'above'));
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchorRef, placement]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[2000]"
      style={{ left: pos.left, top: pos.top, transform: pos.transform }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}

export function UserListsMenu({
  profileId,
  itemPath,
  kind,
  variant = 'button',
  open: controlledOpen,
  onOpenChange,
  className = '',
}: {
  profileId: string;
  itemPath: string;
  kind: ListKind;
  variant?: 'button' | 'icon' | 'icon-detail';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const lists = useUserLists(profileId);
  const matching = lists.filter((l) => l.kind === kind);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const setOpenState = (next: boolean | ((prev: boolean) => boolean)) => {
    const value = typeof next === 'function' ? next(open) : next;
    if (!isControlled) setInternalOpen(value);
    onOpenChange?.(value);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpenState(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const inAny = matching.some((l) => isInList(profileId, l.id, itemPath));
  const placement = variant === 'icon' ? 'above' : 'below';
  const compact = variant === 'icon';
  const usePortal = variant === 'icon' || variant === 'icon-detail';

  const panel = (
    <motion.div
      initial={{ opacity: 0, y: placement === 'above' ? 4 : -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: placement === 'above' ? 4 : -4 }}
    >
      <ListsPopoverPanel
        profileId={profileId}
        itemPath={itemPath}
        kind={kind}
        compact={compact}
        onClose={() => setOpenState(false)}
      />
    </motion.div>
  );

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      {variant === 'icon' ? (
        <button
          ref={buttonRef}
          type="button"
          title="Add to list"
          onClick={(e) => {
            e.stopPropagation();
            setOpenState((o) => !o);
          }}
          className={`w-8 h-8 bg-transparent border-2 rounded-full flex items-center justify-center transition text-white ${
            inAny ? 'border-white bg-white/10' : 'border-gray-500 hover:border-white'
          }`}
        >
          <Plus className="w-4 h-4" />
        </button>
      ) : variant === 'icon-detail' ? (
        <button
          ref={buttonRef}
          type="button"
          title="Lists"
          aria-label="Lists"
          onClick={(e) => {
            e.stopPropagation();
            setOpenState((o) => !o);
          }}
          className={`flex items-center justify-center w-10 h-10 rounded font-bold transition border-2 ${
            inAny
              ? 'border-white text-white bg-white/10 hover:bg-white/20'
              : 'border-gray-500/80 text-white bg-gray-600/40 hover:bg-gray-500/50 hover:border-white'
          }`}
        >
          <BookmarkPlus className="w-5 h-5" />
        </button>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpenState((o) => !o)}
          className={`flex items-center gap-2 px-6 py-2 rounded font-bold transition border-2 ${
            inAny
              ? 'border-white text-white bg-white/10 hover:bg-white/20'
              : 'border-gray-500 text-white bg-transparent hover:border-white'
          }`}
        >
          <BookmarkPlus className="w-5 h-5" />
          Lists
          <ChevronDown className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      <AnimatePresence>
        {open &&
          (usePortal ? (
            <PortalPopover anchorRef={buttonRef} popoverRef={popoverRef} placement={placement}>
              {panel}
            </PortalPopover>
          ) : (
            <div
              className={`absolute left-0 z-[300] ${placement === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
            >
              {panel}
            </div>
          ))}
      </AnimatePresence>
    </div>
  );
}

/** Plus button on hover jawlet — only renders when profile is active. */
export function VideoCardListButton({
  video,
  activeProfileId,
  onOpenChange,
}: {
  video: LocalFile;
  activeProfileId?: string | null;
  onOpenChange?: (open: boolean) => void;
}) {
  if (!activeProfileId) return null;
  return (
    <UserListsMenu
      profileId={activeProfileId}
      itemPath={video.path}
      kind={listKindForVideo(video)}
      variant="icon"
      onOpenChange={onOpenChange}
    />
  );
}
