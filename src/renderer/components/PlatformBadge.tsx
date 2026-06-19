import { PLATFORM_DISPLAY_NAMES, type PlatformId } from '@shared/types/platform';

const styles: Record<PlatformId, string> = {
  facebook: 'text-blue-300 bg-blue-950/40 border-blue-900',
  kijiji: 'text-cyan-300 bg-cyan-950/40 border-cyan-900',
};

export function PlatformBadge({ platform }: { platform: PlatformId }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${styles[platform]}`}>
      {PLATFORM_DISPLAY_NAMES[platform]}
    </span>
  );
}
