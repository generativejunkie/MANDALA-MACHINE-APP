const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;
let projectorWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('mandaramachine.html');

  // DevTools（開発時のみ有効化）
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (projectorWindow && !projectorWindow.isDestroyed()) {
      projectorWindow.close();
    }
  });
}

// V-OUT: プロジェクターウィンドウを開く
ipcMain.on('open-projector', (event) => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.focus();
    event.reply('projector-status', 'focused');
    return;
  }

  const displays = screen.getAllDisplays();
  const secondDisplay = displays.find(d => d.id !== screen.getPrimaryDisplay().id);
  const target = secondDisplay || screen.getPrimaryDisplay();

  projectorWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    fullscreen: !!secondDisplay,
    frame: false,
    movable: true,
    resizable: true,
    alwaysOnTop: false,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  projectorWindow.loadFile('projector.html');

  projectorWindow.on('closed', () => {
    projectorWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('projector-closed');
    }
  });

  event.reply('projector-status', 'opened');
});

// V-OUT: プロジェクターウィンドウを閉じる
ipcMain.on('close-projector', (event) => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.close();
  }
  event.reply('projector-status', 'closed');
});

// V-OUT: フルスクリーントグル
ipcMain.on('toggle-projector-fullscreen', () => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.setFullScreen(!projectorWindow.isFullScreen());
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
