import type { LocalFile } from '../components/NetflixUI';

export type ListKind = 'movie' | 'tv';

export interface UserList {
  id: string;
  name: string;
  kind: ListKind;
  paths: string[];
  order: number;
}

const STORAGE_PREFIX = 'rubflix_user_lists_';
const MAX_NAME_LEN = 40;

function storageKey(profileId: string): string {
  return `${STORAGE_PREFIX}${profileId}`;
}

function readLists(profileId: string): UserList[] {
  try {
    const raw = localStorage.getItem(storageKey(profileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserList[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((l) => l && typeof l.id === 'string' && typeof l.name === 'string')
      .map((l): UserList => ({
        id: l.id,
        name: l.name,
        kind: l.kind === 'tv' ? 'tv' : 'movie',
        paths: Array.isArray(l.paths) ? [...new Set(l.paths.filter((p) => typeof p === 'string'))] : [],
        order: typeof l.order === 'number' ? l.order : 0,
      }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function writeLists(profileId: string, lists: UserList[]): void {
  localStorage.setItem(storageKey(profileId), JSON.stringify(lists));
  invalidateListsSnapshot(profileId);
  window.dispatchEvent(new CustomEvent('rubflix-lists-changed', { detail: { profileId } }));
}

const EMPTY_LISTS: UserList[] = [];
const snapshotCache = new Map<string, { key: string; value: UserList[] }>();

/** Stable snapshot for useSyncExternalStore, same reference until data changes. */
export function getListsSnapshot(profileId: string | null): UserList[] {
  if (!profileId) return EMPTY_LISTS;
  const lists = readLists(profileId);
  const key = JSON.stringify(lists);
  const prev = snapshotCache.get(profileId);
  if (prev?.key === key) return prev.value;
  snapshotCache.set(profileId, { key, value: lists });
  return lists;
}

export function invalidateListsSnapshot(profileId: string): void {
  snapshotCache.delete(profileId);
}

export function loadLists(profileId: string): UserList[] {
  return readLists(profileId);
}

export function saveLists(profileId: string, lists: UserList[]): void {
  writeLists(profileId, lists);
}

function normalizeName(name: string): string {
  return name.trim().slice(0, MAX_NAME_LEN);
}

export function validateListName(name: string): string | null {
  const trimmed = normalizeName(name);
  if (!trimmed) return 'Name is required.';
  return null;
}

export function createList(profileId: string, name: string, kind: ListKind): UserList | null {
  const err = validateListName(name);
  if (err) return null;
  const lists = readLists(profileId);
  const list: UserList = {
    id: crypto.randomUUID(),
    name: normalizeName(name),
    kind,
    paths: [],
    order: lists.length > 0 ? Math.max(...lists.map((l) => l.order)) + 1 : 0,
  };
  writeLists(profileId, [...lists, list]);
  return list;
}

export function renameList(profileId: string, listId: string, name: string): boolean {
  const err = validateListName(name);
  if (err) return false;
  const lists = readLists(profileId);
  const idx = lists.findIndex((l) => l.id === listId);
  if (idx < 0) return false;
  lists[idx] = { ...lists[idx], name: normalizeName(name) };
  writeLists(profileId, lists);
  return true;
}

export function deleteList(profileId: string, listId: string): void {
  const lists = readLists(profileId).filter((l) => l.id !== listId);
  writeLists(profileId, lists);
}

export function reorderLists(profileId: string, orderedIds: string[]): void {
  const lists = readLists(profileId);
  const byId = new Map(lists.map((l) => [l.id, l]));
  const next: UserList[] = [];
  orderedIds.forEach((id, order) => {
    const list = byId.get(id);
    if (list) next.push({ ...list, order });
  });
  for (const list of lists) {
    if (!orderedIds.includes(list.id)) next.push(list);
  }
  writeLists(profileId, next);
}

export function moveList(profileId: string, listId: string, direction: 'up' | 'down'): void {
  const lists = readLists(profileId);
  const idx = lists.findIndex((l) => l.id === listId);
  if (idx < 0) return;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= lists.length) return;
  const reordered = [...lists];
  [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
  writeLists(profileId, reordered.map((l, order) => ({ ...l, order })));
}

export function isInList(profileId: string, listId: string, path: string): boolean {
  const list = readLists(profileId).find((l) => l.id === listId);
  return list ? list.paths.includes(path) : false;
}

export function getListById(profileId: string, listId: string): UserList | undefined {
  return readLists(profileId).find((l) => l.id === listId);
}

export function addItemsToList(profileId: string, listId: string, paths: string[]): number {
  const lists = readLists(profileId);
  const idx = lists.findIndex((l) => l.id === listId);
  if (idx < 0) return 0;
  const list = lists[idx];
  const existing = new Set(list.paths);
  const toAdd = paths.filter((p) => !existing.has(p));
  if (toAdd.length === 0) return 0;
  lists[idx] = { ...list, paths: [...list.paths, ...toAdd] };
  writeLists(profileId, lists);
  return toAdd.length;
}

export function toggleListItem(profileId: string, listId: string, path: string): boolean {
  const lists = readLists(profileId);
  const idx = lists.findIndex((l) => l.id === listId);
  if (idx < 0) return false;
  const list = lists[idx];
  const has = list.paths.includes(path);
  const paths = has ? list.paths.filter((p) => p !== path) : [...list.paths, path];
  lists[idx] = { ...list, paths };
  writeLists(profileId, lists);
  return !has;
}

export function pruneLists(profileId: string, validPaths: Set<string>): void {
  const lists = readLists(profileId);
  let changed = false;
  const next = lists.map((list) => {
    const paths = list.paths.filter((p) => validPaths.has(p));
    if (paths.length !== list.paths.length) changed = true;
    return { ...list, paths };
  });
  if (changed) writeLists(profileId, next);
}

export function resolveListVideos(list: UserList, catalog: LocalFile[]): LocalFile[] {
  const byPath = new Map(catalog.map((v) => [v.path, v]));
  return list.paths.map((p) => byPath.get(p)).filter((v): v is LocalFile => v != null);
}

export function listKindForVideo(video: LocalFile): ListKind {
  return video.isFolder ? 'tv' : 'movie';
}

export function subscribeUserLists(profileId: string | null, onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (profileId && e.key === storageKey(profileId)) onChange();
  };
  const onCustom = (e: Event) => {
    const detail = (e as CustomEvent<{ profileId: string }>).detail;
    if (profileId && detail?.profileId === profileId) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener('rubflix-lists-changed', onCustom);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('rubflix-lists-changed', onCustom);
  };
}
