import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { paths } from './paths';
import { logger } from './logger';
import { initDb } from './db';
import { registerIpc } from './ipc';
import { scheduler } from './scheduler';

const isDev = !!process.env.ELECTRON_RENDERER_URL;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Marketplace Tool',
    backgroundColor: '#0b0b0c',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  const log = logger();
  log.info({ userData: paths.userData }, 'app ready');

  initDb();
  registerIpc(ipcMain, () => mainWindow);
  scheduler.start(() => mainWindow);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  scheduler.stop();
});

process.on('uncaughtException', (err) => {
  logger().error({ err }, 'uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger().error({ reason }, 'unhandledRejection');
});
