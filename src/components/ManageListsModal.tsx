import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import { useUserLists } from '../hooks/useUserLists';
import {
  createList,
  deleteList,
  moveList,
  renameList,
  validateListName,
  type ListKind,
} from '../utils/userLists';
import { ThemedSelect, LIST_KIND_OPTIONS } from './ThemedSelect';

export function ManageListsModal({
  profileId,
  defaultKind,
  onClose,
}: {
  profileId: string;
  defaultKind: ListKind;
  onClose: () => void;
}) {
  const lists = useUserLists(profileId);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<ListKind>(defaultKind);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    const err = validateListName(newName);
    if (err) {
      setError(err);
      return;
    }
    createList(profileId, newName, newKind);
    setNewName('');
    setError(null);
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
    setError(null);
  };

  const saveEdit = (id: string) => {
    if (!renameList(profileId, id, editName)) {
      setError(validateListName(editName) ?? 'Could not rename.');
      return;
    }
    setEditingId(null);
    setError(null);
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] bg-black/80 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-[#181818] w-full max-w-xl min-h-[min(520px,85vh)] max-h-[90vh] rounded-lg shadow-2xl border border-white/10 flex flex-col overflow-visible"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 rounded-t-lg bg-[#181818]">
            <h2 className="text-xl font-bold text-white">Your lists</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
            {lists.length === 0 && (
              <p className="text-sm text-gray-400">Create lists to group movies or series. They appear as rows on the Movies and TV tabs.</p>
            )}
            {lists.map((list) => (
              <div
                key={list.id}
                className="flex items-center gap-2 rounded-lg border border-gray-700 bg-black/30 px-3 py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveList(profileId, list.id, 'up')}
                    className="p-0.5 text-white/40 hover:text-white"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveList(profileId, list.id, 'down')}
                    className="p-0.5 text-white/40 hover:text-white"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  {editingId === list.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(list.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      maxLength={40}
                      autoFocus
                      className="w-full bg-black/50 border border-gray-600 rounded px-2 py-1 text-white text-sm outline-none focus:border-white"
                    />
                  ) : (
                    <>
                      <p className="font-semibold text-white truncate">{list.name}</p>
                      <p className="text-xs text-gray-500">
                        {list.kind === 'movie' ? 'Movies' : 'TV Shows'} · {list.paths.length}{' '}
                        {list.paths.length === 1 ? 'title' : 'titles'}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {editingId === list.id ? (
                    <button
                      type="button"
                      onClick={() => saveEdit(list.id)}
                      className="px-2 py-1 text-xs font-bold bg-white text-black rounded hover:bg-white/90"
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(list.id, list.name)}
                      className="px-2 py-1 text-xs font-semibold text-white/70 hover:text-white"
                    >
                      Rename
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteList(profileId, list.id)}
                    className="p-2 text-white/40 hover:text-red-400 transition"
                    aria-label="Delete list"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 px-6 py-5 border-t border-white/10 space-y-3 overflow-visible rounded-b-lg bg-[#181818]">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">New list</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="List name"
                maxLength={40}
                className="flex-1 bg-black/50 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:border-white"
              />
              <ThemedSelect
                value={newKind}
                onChange={setNewKind}
                options={LIST_KIND_OPTIONS}
                className="w-[8.5rem] shrink-0"
                buttonClassName="w-full px-3 py-2 bg-black/50"
                menuZIndex={450}
                menuPlacement="above"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="button"
              onClick={handleCreate}
              className="w-full py-2.5 rounded font-bold bg-accent text-white hover:bg-red-700 transition"
            >
              Create list
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
