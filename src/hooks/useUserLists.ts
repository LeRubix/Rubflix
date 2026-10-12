import { useCallback, useSyncExternalStore } from 'react';
import {
  getListsSnapshot,
  subscribeUserLists,
  type UserList,
} from '../utils/userLists';

export function useUserLists(profileId: string | null): UserList[] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeUserLists(profileId, onStoreChange),
    [profileId],
  );
  const getSnapshot = useCallback(() => getListsSnapshot(profileId), [profileId]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
