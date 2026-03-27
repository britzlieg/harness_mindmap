import { app, BrowserWindow, Menu, ipcMain, screen } from 'electron';
import path from 'path';
import { registerFileHandlers } from './ipc/file-handlers';
import { registerLayoutHandlers } from './ipc/layout-handlers';
import { registerExportHandlers } from './ipc/export-handlers';
import { assertTrustedIpcSender } from './ipc/security';

let mainWindow: BrowserWindow | null = null;

function registerWindowHandlers(): void {
  ipcMain.handle('window:minimize', (event) => {
    assertTrustedIpcSender(event);
    const hostWindow = BrowserWindow.fromWebContents(event.sender);
    hostWindow?.minimize();
  });

  ipcMain.handle('window:toggleMaximize', (event) => {
    assertTrustedIpcSender(event);
    const hostWindow = BrowserWindow.fromWebContents(event.sender);
    if (!hostWindow) {
      return false;
    }
    if (hostWindow.isMaximized()) {
      hostWindow.unmaximize();
    } else {
      hostWindow.maximize();
    }
    return hostWindow.isMaximized();
  });

  ipcMain.handle('window:close', (event) => {
    assertTrustedIpcSender(event);
    const hostWindow = BrowserWindow.fromWebContents(event.sender);
    hostWindow?.close();
  });

  ipcMain.handle('window:isMaximized', (event) => {
    assertTrustedIpcSender(event);
    const hostWindow = BrowserWindow.fromWebContents(event.sender);
    return hostWindow?.isMaximized() ?? false;
  });
}

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(width * 0.8, 1400),
    height: Math.min(height * 0.8, 900),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'MindMap',
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    show: false,
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerFileHandlers();
  registerLayoutHandlers();
  registerExportHandlers();
  registerWindowHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

export { createWindow };
