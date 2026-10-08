import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { X, ZoomIn } from 'lucide-react';
import { cropImageToJpegDataUrl } from '../utils/profileImageCrop';

export function ProfileImageCropModal({
  imageSrc,
  onCancel,
  onApply,
}: {
  imageSrc: string;
  onCancel: () => void;
  onApply: (jpegDataUrl: string) => void | Promise<void>;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const handleApply = async () => {
    if (!croppedAreaPixels || saving) return;
    setSaving(true);
    try {
      const dataUrl = await cropImageToJpegDataUrl(imageSrc, croppedAreaPixels);
      await onApply(dataUrl);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-lg bg-[#181818] rounded-xl border border-gray-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Crop profile photo</h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative h-72 sm:h-80 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="px-5 py-4 space-y-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <ZoomIn className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-accent"
              aria-label="Zoom"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-300 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!croppedAreaPixels || saving}
              className="px-5 py-2 rounded-lg text-sm font-bold bg-accent text-white hover:opacity-90 disabled:opacity-40 transition"
            >
              {saving ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
