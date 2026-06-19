import pino from 'pino';
import path from 'node:path';
import { paths } from './paths';

let cached: pino.Logger | null = null;

export function logger(): pino.Logger {
  if (cached) return cached;
  const isDev = !!process.env.ELECTRON_RENDERER_URL;
  cached = pino({
    level: isDev ? 'debug' : 'info',
    base: undefined,
    transport: {
      targets: [
        {
          target: 'pino/file',
          options: { destination: path.join(paths.logs, 'app.log'), mkdir: true },
          level: isDev ? 'debug' : 'info',
        },
        ...(isDev
          ? [
              {
                target: 'pino-pretty',
                options: { colorize: true },
                level: 'debug',
              },
            ]
          : []),
      ],
    },
  });
  return cached;
}
