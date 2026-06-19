import { useThumb } from '../hooks/usePhoto';
import { ImageOff } from 'lucide-react';

export function PhotoTile({ hash, size = 64 }: { hash: string | null | undefined; size?: number }) {
  const { data } = useThumb(hash);
  if (!hash || data === null) {
    return (
      <div
        className="flex items-center justify-center rounded-md bg-surface-hover text-muted"
        style={{ width: size, height: size }}
      >
        <ImageOff size={size * 0.4} />
      </div>
    );
  }
  return (
    <img
      src={data ?? ''}
      alt=""
      className="rounded-md object-cover"
      style={{ width: size, height: size }}
    />
  );
}
