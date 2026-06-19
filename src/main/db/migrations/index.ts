// Import migration SQL as raw strings at build time (electron-vite handles ?raw).
import m001 from './001_init.sql?raw';
import m002 from './002_snooze_pause.sql?raw';
import m003 from './003_notes.sql?raw';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  { version: 1, name: '001_init', sql: m001 },
  { version: 2, name: '002_snooze_pause', sql: m002 },
  { version: 3, name: '003_notes', sql: m003 },
].sort((a, b) => a.version - b.version);
