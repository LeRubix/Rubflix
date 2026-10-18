import { useEffect, useRef } from 'react';

export interface PlayerKeyboardHandlers {
  onTogglePause: () => void;
  onSeek: (delta: number) => void;
  onVolumeStep: (delta: number) => void;
  onMute: () => void;
  onFullscreen: () => void;
  onEscape: () => void;
  onSubtitlesToggle: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onActivity: () => void;
}

export function usePlayerKeyboard(handlers: PlayerKeyboardHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'range') return;
      const h = ref.current;
      let handled = true;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          h.onTogglePause();
          break;
        case 'ArrowLeft':
          h.onSeek(e.shiftKey ? -30 : -10);
          break;
        case 'ArrowRight':
          h.onSeek(e.shiftKey ? 30 : 10);
          break;
        case 'j':
        case 'J':
          h.onSeek(-10);
          break;
        case 'l':
        case 'L':
          h.onSeek(10);
          break;
        case 'ArrowUp':
          h.onVolumeStep(5);
          break;
        case 'ArrowDown':
          h.onVolumeStep(-5);
          break;
        case 'm':
        case 'M':
          h.onMute();
          break;
        case 'f':
        case 'F':
          h.onFullscreen();
          break;
        case 'c':
        case 'C':
          h.onSubtitlesToggle();
          break;
        case 'p':
        case 'P':
          if (e.shiftKey && h.onPrev) h.onPrev();
          else handled = false;
          break;
        case 'n':
        case 'N':
          if (e.shiftKey && h.onNext) h.onNext();
          else handled = false;
          break;
        case 'Escape':
          h.onEscape();
          break;
        default:
          handled = false;
      }

      if (handled) {
        e.preventDefault();
        h.onActivity();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
