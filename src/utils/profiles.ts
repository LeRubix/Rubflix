import { generateLocalAvatar } from './avatar';

export interface Profile {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

const AVATAR_GUEST = './avatars/key2.jpg';

export const DEFAULT_PROFILES: Profile[] = [
  { id: '1', name: 'Guest', color: '#0071eb', avatar: AVATAR_GUEST },
];

export function normalizeStoredProfiles(profiles: Profile[]): { profiles: Profile[]; changed: boolean } {
  let changed = false;
  let list = profiles.filter((p) => {
    if (p.id === '1' && p.name === 'Kud') {
      changed = true;
      return false;
    }
    return true;
  });

  list = list.map((p) => {
    if (
      p.avatar.includes('api.dicebear.com') ||
      p.avatar.startsWith('data:image/svg') ||
      p.avatar.includes('./avatars/avatar')
    ) {
      changed = true;
      return { ...p, avatar: generateLocalAvatar(p.name) };
    }
    return p;
  });

  if (list.length === 0) {
    changed = true;
    list = [...DEFAULT_PROFILES];
  }

  return { profiles: list, changed };
}
