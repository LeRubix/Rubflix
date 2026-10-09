import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const FALLBACK_RELEASE_URL = 'https://github.com/LeRubix/Rubflix/releases/latest';

export function UpdateAvailableNotice({
  latestVersion,
  releaseUrl,
  onDismiss,
}: {
  latestVersion: string;
  releaseUrl: string | null;
  onDismiss: () => void;
}) {
  const href = releaseUrl ?? FALLBACK_RELEASE_URL;

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-8 left-1/2 z-[120] w-[min(100%-2rem,28rem)] -translate-x-1/2 pointer-events-auto"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-3 rounded-md border border-white/10 bg-[#181818]/95 px-4 py-3 shadow-2xl backdrop-blur-md">
        <p className="flex-1 text-sm text-gray-200 leading-snug min-w-0">
          <span className="text-white font-semibold">Update available</span>
          <span className="text-gray-400"> · v{latestVersion}</span>
        </p>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-white/90 transition"
        >
          Get update
        </a>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 rounded text-gray-500 hover:text-white transition"
          aria-label="Dismiss update notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
