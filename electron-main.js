const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;
let projectorWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    fullscreen: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('mandaramachine.html');

  mainWindow.on('closed', function () {
    mainWindow = null;
    if (projectorWindow) {
      projectorWindow.close();
      projectorWindow = null;
    }
  });
}

// V-OUT: projector window
function openProjectorWindow() {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.focus();
    return;
  }

  const displays = screen.getAllDisplays();
  const externalDisplay = displays.find(d => d.id !== screen.getPrimaryDisplay().id);
  const bounds = externalDisplay ? externalDisplay.bounds : { x: 100, y: 100, width: 1920, height: 1080 };

  projectorWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
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

  projectorWindow.on('closed', function () {
    projectorWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('projector-closed');
    }
  });
}

ipcMain.on('open-projector', () => openProjectorWindow());

ipcMain.on('close-projector', () => {
  if (projectorWindow && !projectorWindow.isDestroyed()) projectorWindow.close();
});

ipcMain.on('canvas-frame', (event, dataURL) => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.webContents.send('canvas-frame', dataURL);
  }
});

ipcMain.on('projector-fullscreen', (event, flag) => {
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.setFullScreen(flag);
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});
