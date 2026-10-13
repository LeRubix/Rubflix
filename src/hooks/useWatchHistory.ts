import { useCallback, useSyncExternalStore } from 'react';
import { getWatchHistorySnapshot, subscribeWatchHistory, type WatchHistoryEntry } from '../utils/watchHistory';

export function useWatchHistory(profileId: string | null): WatchHistoryEntry[] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeWatchHistory(profileId, onStoreChange),
    [profileId],
  );
  const getSnapshot = useCallback(() => getWatchHistorySnapshot(profileId), [profileId]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
