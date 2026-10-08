import { useCallback, useState } from 'react';
import { filePathToImageSrc } from '../utils/profileImageCrop';

export function useProfileImageCropFlow(onAvatarSaved: (fileUrl: string) => void) {
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const pickProfileImage = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.pickProfileImage) return;
    const picked = await api.pickProfileImage();
    if (picked) setCropImageSrc(filePathToImageSrc(picked));
  }, []);

  const cancelCrop = useCallback(() => setCropImageSrc(null), []);

  const applyCrop = useCallback(
    async (jpegDataUrl: string) => {
      const api = window.electronAPI;
      if (!api?.saveProfileImage) return;
      const saved = await api.saveProfileImage(jpegDataUrl);
      if (saved) {
        onAvatarSaved(saved);
        setCropImageSrc(null);
      }
    },
    [onAvatarSaved],
  );

  return { cropImageSrc, pickProfileImage, cancelCrop, applyCrop };
}
