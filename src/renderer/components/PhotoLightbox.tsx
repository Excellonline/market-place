import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { usePhoto } from '../hooks/usePhoto';

interface Props {
  hashes: string[];
  initialIndex: number;
  onClose: () => void;
}

export function PhotoLightbox({ hashes, initialIndex, onClose }: Props) {
  const [idx, setIdx] = useState(initialIndex);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(hashes.length - 1, i + 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hashes.length, onClose]);

  const hash = hashes[idx] ?? null;
  const { data } = usePhoto(hash);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-md p-2 text-zinc-300 hover:bg-white/10"
        aria-label="Close"
      >
        <X size={20} />
      </button>

      {hashes.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => Math.max(0, i - 1));
            }}
            disabled={idx === 0}
            className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 disabled:opacity-30"
            aria-label="Previous"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => Math.min(hashes.length - 1, i + 1));
            }}
            disabled={idx === hashes.length - 1}
            className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 disabled:opacity-30"
            aria-label="Next"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-black/60 px-3 py-1 text-xs text-zinc-300">
        {idx + 1} / {hashes.length}
      </div>

      {data ? (
        <img
          src={data}
          alt=""
          className="max-h-[90vh] max-w-[90vw] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="text-zinc-500">Loading…</div>
      )}
    </div>
  );
}
