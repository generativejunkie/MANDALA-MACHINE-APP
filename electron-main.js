const { app, BrowserWindow, ipcMain, screen, session } = require('electron');
const path = require('path');
const osc  = require('./osc-bridge');

// GPU パフォーマンス最適化（高解像度 V-OUT 用）
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('disable-frame-rate-limit');

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

  // マイク・カメラのアクセス許可
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'microphone', 'camera', 'audioCapture', 'videoCapture'];
    callback(allowed.includes(permission));
  });

  mainWindow.loadFile('mandaramachine.html');
  mainWindow.webContents.on('console-message', (e, level, msg) => {
    if (msg.includes('[STAR]')) console.log('[R]', msg);
  });


  // window.open() で開く "Mandala Output" ポップアップを捕捉
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        fullscreenable: true,
        backgroundColor: '#000000',
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          hardwareAcceleration: true
        }
      }
    };
  });

  // ポップアップ生成後: requestFullscreen をネイティブ IPC に差し替え
  mainWindow.webContents.on('did-create-window', (childWindow) => {
    childWindow.webContents.on('dom-ready', () => {
      childWindow.webContents.executeJavaScript(`
        (function() {
          const _orig = document.body.requestFullscreen
            ? document.body.requestFullscreen.bind(document.body)
            : null;
          document.body.requestFullscreen = function() {
            try {
              const { ipcRenderer } = require('electron');
              ipcRenderer.send('popup-request-fullscreen');
            } catch(e) {}
            return Promise.resolve();
          };
          document.documentElement.requestFullscreen = document.body.requestFullscreen;
        })();
      `).catch(() => {});
    });
  });

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

// Mandala Output ポップアップからのフルスクリーン要求
ipcMain.on('popup-request-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setFullScreen(true);
});

// ── OSC IPC handlers ──────────────────────────────────────────────────────
// Renderer → ipcRenderer.send('osc', '/addr', arg0, arg1, ...)
ipcMain.on('osc', (event, address, ...args) => {
    osc.send(address, args);
});

// Renderer requests connect/disconnect
ipcMain.on('osc-connect', (event, host, port) => {
    osc.connect(host, port);
});

// Relay connection status back to renderer
osc.setStatusCallback((connected, host, port) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('osc-status', { connected, host, port });
    }
});

// Auto-connect on startup (TouchDesigner default port)
osc.connect('127.0.0.1', 10000);

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});
