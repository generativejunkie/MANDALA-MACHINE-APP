const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

// GPU パフォーマンス最適化（高解像度 V-OUT 用）
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('disable-frame-rate-limit');

let mainWindow;
let projectorWindow;
let popupWindow;  // エンジンの Mandala Output ポップアップ

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

  // ポップアップ生成後: requestFullscreen パッチ + オーバーレイキャンバス注入
  mainWindow.webContents.on('did-create-window', (childWindow) => {
    popupWindow = childWindow;
    console.log('[V-OUT] popup created');
    childWindow.on('closed', () => { popupWindow = null; console.log('[V-OUT] popup closed'); });
    childWindow.webContents.on('console-message', (e, level, msg) => {
      if (msg.includes('[V-OUT]')) console.log('[POPUP]', msg);
    });

    childWindow.webContents.on('did-finish-load', () => {
      console.log('[V-OUT] popup did-finish-load, url:', childWindow.webContents.getURL());
    });

    childWindow.webContents.on('dom-ready', () => {
      console.log('[V-OUT] popup dom-ready, url:', childWindow.webContents.getURL());

      // ハイブリッド方式:
      //   p5 canvas → rAF + drawImage（テキスト: シャープ優先）
      //   liqCanvas → captureStream + video（WebGL: preserveDrawingBuffer=false対策）
      childWindow.webContents.executeJavaScript(`
        (function() {
          // requestFullscreen パッチ
          function patchFS() {
            try {
              const fn = () => { try { require('electron').ipcRenderer.send('popup-request-fullscreen'); } catch(e){} return Promise.resolve(); };
              if (document.body) document.body.requestFullscreen = fn;
              document.documentElement.requestFullscreen = fn;
            } catch(e) {}
          }

          // p5用: 描画先キャンバスを取得/作成
          function ensureCanvas(id, blendMode) {
            const body = document.body;
            if (!body) return null;
            let c = document.getElementById(id);
            if (!c) {
              c = document.createElement('canvas');
              c.id = id;
              c.style.cssText =
                'position:fixed;top:0;left:0;pointer-events:none;' +
                'mix-blend-mode:' + blendMode + ';z-index:99991;';
              body.appendChild(c);
            }
            if (body.lastChild !== c) body.appendChild(c);
            return c;
          }

          // LIQ用: video要素を取得/作成
          function ensureVideo(id, stream) {
            const body = document.body;
            if (!body) return null;
            let v = document.getElementById(id);
            if (!v) {
              v = document.createElement('video');
              v.id = id;
              v.muted = true; v.autoplay = true; v.playsInline = true;
              v.style.cssText =
                'position:fixed;top:0;left:0;width:100%;height:100%;' +
                'pointer-events:none;object-fit:cover;' +
                'mix-blend-mode:screen;z-index:99990;';
              body.appendChild(v);
              console.log('[V-OUT] liq video injected');
            }
            if (v.srcObject !== stream) { v.srcObject = stream; v.play().catch(() => {}); }
            if (body.lastChild !== v) body.appendChild(v);
            return v;
          }

          let _liqStream = null;
          let _rafId = null;
          let _started = false;

          function startCopyLoop() {
            if (_started) return;
            const opener = window.opener;
            if (!opener) return;
            const body = document.body;
            if (!body) return;

            _started = true;
            console.log('[V-OUT] copy loop started');

            const dpr = window.devicePixelRatio || 1;

            // LIQ: captureStream（一度だけ取得）
            try {
              const liq = opener.document.getElementById('liquidCanvas');
              if (liq) {
                _liqStream = liq.captureStream(30);
                console.log('[V-OUT] liq stream captured');
              }
            } catch(e) {}

            function frame() {
              patchFS();
              const body2 = document.body;
              if (!body2) { _rafId = requestAnimationFrame(frame); return; }

              // LIQ video: 可視状態をソースに同期
              try {
                const liq = opener.document.getElementById('liquidCanvas');
                if (_liqStream) {
                  const liqVisible = liq && liq.style.display !== 'none';
                  const v = ensureVideo('__mm_liq_v', _liqStream);
                  if (v) v.style.display = liqVisible ? '' : 'none';
                }
              } catch(e) {}

              // p5: rAF drawImage（シャープなテキスト）
              try {
                const p5c = opener.document.querySelector('#p5-container canvas');
                if (p5c && p5c.width > 0) {
                  const c = ensureCanvas('__mm_p5_cv', 'screen');
                  if (c) {
                    const w = window.innerWidth, h = window.innerHeight;
                    if (c.width !== w * dpr) { c.width = w * dpr; c.style.width = w + 'px'; }
                    if (c.height !== h * dpr) { c.height = h * dpr; c.style.height = h + 'px'; }
                    const ctx = c.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.clearRect(0, 0, c.width, c.height);
                    ctx.drawImage(p5c, 0, 0, c.width, c.height);
                  }
                }
              } catch(e) {}

              _rafId = requestAnimationFrame(frame);
            }
            frame();
          }

          // エンジンの document.write 完了を待って開始
          setTimeout(startCopyLoop, 1200);

          // body未確定の場合に再試行
          setInterval(() => {
            if (!_started && document.body) startCopyLoop();
          }, 500);
        })();
      `).catch(e => console.log('[V-OUT] executeJS error:', e));
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

let _overlayCnt = 0;
ipcMain.on('overlay-frame', (event, dataURL) => {
  _overlayCnt++;
  if (_overlayCnt <= 3) console.log('[V-OUT] overlay-frame #' + _overlayCnt + ' len:', dataURL?.length, 'popup:', !!popupWindow && !popupWindow.isDestroyed());
  if (projectorWindow && !projectorWindow.isDestroyed()) {
    projectorWindow.webContents.send('overlay-frame', dataURL);
  }
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.webContents.send('overlay-frame', dataURL);
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

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});
