import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Plus, X, GripVertical, ClipboardPaste } from 'lucide-react';
import { PhotoTile } from './PhotoTile';

interface Props {
  hashes: string[];
  onChange: (hashes: string[]) => void;
  max?: number;
}

export function PhotoDropzone({ hashes, onChange, max = 10 }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [pasteHint, setPasteHint] = useState<'idle' | 'received' | 'rejected'>('idle');
  const dragImg = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function onPaste(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      const images: File[] = [];
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) images.push(f);
        }
      }
      if (images.length === 0) return;
      e.preventDefault();
      const newHashes: string[] = [];
      for (const f of images) {
        if (hashes.length + newHashes.length >= max) break;
        const buf = await f.arrayBuffer();
        const r = await window.marketplace.storePhotoBytes(buf);
        if (r) newHashes.push(r.hash);
      }
      if (newHashes.length > 0) {
        onChange([...hashes, ...newHashes].slice(0, max));
        setPasteHint('received');
        setTimeout(() => setPasteHint('idle'), 1500);
      } else {
        setPasteHint('rejected');
        setTimeout(() => setPasteHint('idle'), 1500);
      }
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [hashes, max, onChange]);

  async function importMore() {
    const r = await window.marketplace.importPhotos();
    if (r.hashes.length === 0) return;
    const next = [...hashes, ...r.hashes].slice(0, max);
    onChange(next);
  }

  function remove(h: string) {
    onChange(hashes.filter((x) => x !== h));
  }

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, idx: number) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    // Use the same element as the drag image so it's not a default broken-image icon.
    if (dragImg.current) e.dataTransfer.setDragImage(dragImg.current, 32, 32);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const next = [...hashes];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved!);
    onChange(next);
    setDragIdx(null);
    setOverIdx(null);
  }

  function handleDragEnd() {
    setDragIdx(null);
    setOverIdx(null);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {hashes.map((h, i) => (
          <div
            key={h}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
            className={`group relative rounded-md transition-opacity ${
              dragIdx === i ? 'opacity-40' : ''
            } ${overIdx === i && dragIdx !== i ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}`}
          >
            <PhotoTile hash={h} size={80} />
            {i === 0 && (
              <span className="absolute bottom-0 left-0 right-0 rounded-b-md bg-black/60 px-1 py-0.5 text-center text-[9px] uppercase tracking-wider text-white">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(h)}
              className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 rounded-full bg-zinc-900 p-0.5 text-zinc-300 ring-1 ring-zinc-700 hover:text-danger"
              aria-label="Remove photo"
            >
              <X size={12} />
            </button>
            <span
              className="absolute left-0.5 top-0.5 cursor-grab rounded bg-black/40 p-0.5 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100"
              title="Drag to reorder"
            >
              <GripVertical size={11} />
            </span>
          </div>
        ))}
        {hashes.length < max && (
          <button
            type="button"
            onClick={importMore}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-surface text-muted hover:bg-surface-hover hover:text-fg"
          >
            <Plus size={16} />
            <span className="text-[10px]">Add</span>
          </button>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
        <ImageIcon size={11} />
        <span>{hashes.length} / {max} photos · drag to reorder · first is the cover · ⌘V/Ctrl+V to paste</span>
        {pasteHint === 'received' && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/40 px-1.5 py-0.5 text-success">
            <ClipboardPaste size={10} /> Pasted
          </span>
        )}
        {pasteHint === 'rejected' && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-950/40 px-1.5 py-0.5 text-warn">
            <ClipboardPaste size={10} /> Nothing to paste
          </span>
        )}
      </div>
      {/* Hidden drag image */}
      <div ref={dragImg} className="pointer-events-none absolute -left-[9999px] h-16 w-16 rounded-md bg-accent" />
    </div>
  );
}
