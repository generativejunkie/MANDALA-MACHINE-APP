const { app, BrowserWindow, ipcMain, screen, desktopCapturer } = require('electron');
const path = require('path');

// GPU パフォーマンス最適化（高解像度 V-OUT 用）
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('disable-frame-rate-limit');
app.commandLine.appendSwitch('enable-features', 'WebGPU,WebGPUDeveloperFeatures');

let mainWindow;
let projectorWindow;
let popupWindow;  // エンジンの Mandara Output ポップアップ

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
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
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    const allowed = ['media', 'microphone', 'camera', 'audioCapture', 'videoCapture'];
    return allowed.includes(permission);
  });

  mainWindow.loadFile('mandaramachine.html');
  mainWindow.webContents.on('console-message', (e, level, msg) => {
    if (msg.includes('[STAR]') || msg.includes('[REC]')) console.log('[R]', msg);
  });

  // window.open() で開く "Mandara Output" ポップアップを捕捉
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
          function ensureCanvas(id, blendMode, zIndex) {
            const body = document.body;
            if (!body) return null;
            let c = document.getElementById(id);
            if (!c) {
              c = document.createElement('canvas');
              c.id = id;
              c.style.cssText =
                'position:fixed;top:0;left:0;pointer-events:none;' +
                'mix-blend-mode:' + blendMode + ';z-index:' + (zIndex || 99991) + ';';
              body.appendChild(c);
            }
            if (body.lastChild !== c) body.appendChild(c);
            return c;
          }

          // video要素を取得/作成（blendMode・zIndex指定可）
          function ensureVideo(id, stream, blendMode, zIndex) {
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
                'mix-blend-mode:' + (blendMode || 'screen') + ';z-index:' + (zIndex || 99990) + ';';
              body.appendChild(v);
              console.log('[V-OUT] video injected id=' + id);
            }
            if (v.srcObject !== stream) { v.srcObject = stream; v.play().catch(() => {}); }
            if (body.lastChild !== v) body.appendChild(v);
            return v;
          }

          // OBJ STROBE用オーバーレイdivを取得/作成
          function ensureStrobeDiv() {
            const body = document.body;
            if (!body) return null;
            let d = document.getElementById('__mm_strobe_ov');
            if (!d) {
              d = document.createElement('div');
              d.id = '__mm_strobe_ov';
              d.style.cssText =
                'position:fixed;top:0;left:0;width:100%;height:100%;' +
                'pointer-events:none;mix-blend-mode:color-dodge;z-index:99992;' +
                'background:black;display:none;';
              body.appendChild(d);
            }
            return d;
          }

          let _liqStream = null, _liqCapturedW = 0;
          let _threeStream = null, _threeCapturedW = 0;
          let _neuroStream = null, _neuroCapturedW = 0;
          let _codeStream  = null, _codeCapturedW  = 0;
          let _rafId = null, _started = false;

          // ポップアップ自身のcanvas/videoのみCSSで非表示
          // divは隠さない（RESET後も構造を維持するため）
          (function injectHideCSS() {
            try {
              const s = document.createElement('style');
              s.id = '__mm_hide_style';
              s.textContent =
                'body { background: #000 !important; }' +
                'canvas:not([id^="__mm_"]) { visibility: hidden !important; opacity: 0 !important; }' +
                'video:not([id^="__mm_"]) { visibility: hidden !important; opacity: 0 !important; }';
              (document.head || document.documentElement).appendChild(s);
              console.log('[V-OUT] hide CSS injected');
            } catch(e) {}
          })();

          function startCopyLoop() {
            if (_started) return;
            const opener = window.opener;
            if (!opener) return;
            const body = document.body;
            if (!body) return;

            _started = true;
            console.log('[V-OUT] copy loop started');

            const dpr = window.devicePixelRatio || 1;

            function tryCapture(canvas, currentStream, currentW) {
              if (!currentStream || currentW !== canvas.width) {
                if (currentStream) currentStream.getTracks().forEach(t => t.stop());
                try {
                  const s = canvas.captureStream(30);
                  console.log('[V-OUT] captured ' + (canvas.id || 'canvas') + ' ' + canvas.width + 'x' + canvas.height);
                  return { stream: s, w: canvas.width };
                } catch(e) {}
              }
              return { stream: currentStream, w: currentW };
            }

            function frame() {
              patchFS();
              if (!document.body) { _rafId = requestAnimationFrame(frame); return; }

              // ── LIQ video（WebGL液体シェーダー）──
              // liquidCanvas が表示中かどうかを先に判定し、
              // 表示中は Three.js キャンバスを V-OUT で非表示にする（スモークのみ出力）
              let liqOn = false;
              try {
                const liq = opener.document.getElementById('liquidCanvas');
                const liqVisible = liq && liq.style.display !== 'none';
                if (liqVisible && liq.width > 300) {
                  liqOn = true;
                  const r = tryCapture(liq, _liqStream, _liqCapturedW);
                  _liqStream = r.stream; _liqCapturedW = r.w;
                  if (_liqStream) {
                    const v = ensureVideo('__mm_liq_v', _liqStream, 'normal', 99990);
                    if (v) v.style.display = '';
                  }
                } else {
                  const v = document.getElementById('__mm_liq_v');
                  if (v) v.style.display = 'none';
                }
              } catch(e) {}

              // ── Three.js メインキャンバス（liq非表示時のみ出力）──
              try {
                const threec = opener.document.querySelector('#canvasContainer canvas');
                if (!liqOn && threec && threec.width > 300) {
                  const r = tryCapture(threec, _threeStream, _threeCapturedW);
                  _threeStream = r.stream; _threeCapturedW = r.w;
                  if (_threeStream) {
                    const v = ensureVideo('__mm_three_v', _threeStream, 'normal', 99985);
                    if (v) v.style.display = '';
                  }
                } else {
                  const v = document.getElementById('__mm_three_v');
                  if (v) v.style.display = 'none';
                }
              } catch(e) {}

              // ── p5: rAF drawImage（シャープなテキスト）──
              try {
                const p5c = opener.document.querySelector('#p5-container canvas');
                if (p5c && p5c.width > 0) {
                  const c = ensureCanvas('__mm_p5_cv', 'screen', 99991);
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

              // ── NEURO LINK（captureStream → video）──
              try {
                const neuroC = opener.document.getElementById('neuroLinkCanvas');
                if (neuroC && neuroC.style.display !== 'none' && neuroC.width > 0) {
                  const r = tryCapture(neuroC, _neuroStream, _neuroCapturedW);
                  _neuroStream = r.stream; _neuroCapturedW = r.w;
                  if (_neuroStream) {
                    const v = ensureVideo('__mm_neuro_v', _neuroStream, 'screen', 99992);
                    if (v) v.style.display = '';
                  }
                } else {
                  const v = document.getElementById('__mm_neuro_v');
                  if (v) v.style.display = 'none';
                }
              } catch(e) {}

              // ── CODE mode（captureStream → video, multiply blend）──
              try {
                const codeC = opener.document.getElementById('codeModeCanvas');
                if (codeC && codeC.style.display !== 'none' && codeC.width > 0) {
                  const r = tryCapture(codeC, _codeStream, _codeCapturedW);
                  _codeStream = r.stream; _codeCapturedW = r.w;
                  if (_codeStream) {
                    const v = ensureVideo('__mm_code_v', _codeStream, 'multiply', 99993);
                    if (v) v.style.display = '';
                  }
                } else {
                  const v = document.getElementById('__mm_code_v');
                  if (v) v.style.display = 'none';
                }
              } catch(e) {}

              // ── BOOT OVERLAY（コードレイン + プログレスバー）──
              try {
                const bocC = opener.document.getElementById('bootVoutCanvas');
                if (bocC && bocC.width > 0) {
                  const c = ensureCanvas('__mm_boc_cv', 'normal', 99994);
                  if (c) {
                    const W = window.innerWidth, H = window.innerHeight;
                    if (c.width !== W) { c.width = W; c.style.width = W + 'px'; }
                    if (c.height !== H) { c.height = H; c.style.height = H + 'px'; }
                    const cx = c.getContext('2d');
                    cx.clearRect(0, 0, W, H);
                    cx.drawImage(bocC, 0, 0, W, H);
                  }
                } else {
                  const c = document.getElementById('__mm_boc_cv');
                  if (c) { const cx = c.getContext('2d'); cx.clearRect(0, 0, c.width, c.height); }
                }
              } catch(e) {}

              // ── OBJ STROBE オーバーレイ同期 ──
              try {
                const srcStrobe = opener.document.getElementById('objStrobeOverlay');
                if (srcStrobe) {
                  const d = ensureStrobeDiv();
                  if (d) {
                    d.style.display = srcStrobe.style.display;
                    d.style.backgroundColor = srcStrobe.style.backgroundColor;
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

// desktopCapturer はメインプロセスのみで使用可（Electron 17+）
ipcMain.handle('get-desktop-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 1, height: 1 }
  });
  return sources.map(s => ({ id: s.id, name: s.name }));
});

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

// Mandara Output ポップアップからのフルスクリーン要求
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
