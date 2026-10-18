import { Eye } from 'lucide-react';
import { useImageBrightness } from '../hooks/useImageBrightness';
import type { Settings } from './SettingsModal';

export function WatchedEyeIndicator({
  imageSrc,
  mode,
  hovered = false,
  size = 'default',
}: {
  imageSrc?: string;
  mode: Settings['watchedIndicatorMode'];
  hovered?: boolean;
  size?: 'default' | 'small';
}) {
  const brightness = useImageBrightness(imageSrc, 'top');
  if (mode === 'never') return null;

  const isLight = brightness === 'light';
  const show = mode === 'always' || (mode === 'hover' && hovered);

  return (
    <div
      className={`absolute top-1.5 right-1.5 z-10 pointer-events-none transition-opacity duration-200 ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <Eye
        className={`${size === 'small' ? 'w-3.5 h-3.5' : 'w-5 h-5'} ${
          isLight
            ? 'text-black drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]'
            : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]'
        }`}
        strokeWidth={size === 'small' ? 2.5 : 3}
      />
    </div>
  );
}
