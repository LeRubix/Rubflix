import { useEffect, useState } from 'react';

const DISPLAY_MS = 1000;
const FADE_MS = 200;

export function StartupScreen({ onComplete, appName, accentColor }: { onComplete: () => void; appName: string; accentColor: string }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Optional sound, never block the splash if missing or slow
    const audio = new Audio('/startup.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});

    const fadeTimer = window.setTimeout(() => setFading(true), DISPLAY_MS);
    const doneTimer = window.setTimeout(onComplete, DISPLAY_MS + FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
      audio.pause();
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[999] bg-black flex items-center justify-center transition-opacity duration-[400ms] ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <div
        className="text-5xl md:text-7xl font-black tracking-tighter animate-startup-logo"
        style={{
          color: accentColor,
          textShadow: `0 0 40px ${accentColor}80, 0 0 100px ${accentColor}40`,
        }}
      >
        {appName || 'RUBFLIX'}
      </div>
    </div>
  );
}
