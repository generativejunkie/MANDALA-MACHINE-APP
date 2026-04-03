const { app, BrowserWindow, ipcMain, screen } = require('electron');
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

  mainWindow.loadFile('mandaramachine.html');
  mainWindow.webContents.on('console-message', (e, level, msg) => {
    if (msg.includes('[STAR]')) console.log('[R]', msg);
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

          // ── V-OUT REC ボタン注入 ──────────────────────────────
          (function injectRecButton() {
            const btn = document.createElement('button');
            btn.id = '__mm_rec_btn';
            btn.textContent = 'REC';
            btn.style.cssText =
              'position:fixed;top:12px;right:12px;z-index:99999;' +
              'padding:4px 14px;font-size:11px;font-weight:700;letter-spacing:2px;' +
              'background:transparent;border:1px solid rgba(255,255,255,0.3);color:rgba(255,255,255,0.5);' +
              'cursor:pointer;border-radius:2px;font-family:monospace;transition:all 0.2s;';

            let recorder = null, chunks = [], rafId2 = null, audioStream = null;
            let threeVid2 = null, liqVid2 = null;

            function cleanup() {
              if (rafId2) { cancelAnimationFrame(rafId2); rafId2 = null; }
              [threeVid2, liqVid2].forEach(v => {
                if (v) try { v.srcObject?.getTracks().forEach(t => t.stop()); } catch(e) {}
              });
              threeVid2 = null; liqVid2 = null;
              if (audioStream) { audioStream.getTracks().forEach(t => t.stop()); audioStream = null; }
            }

            async function startRec() {
              const W = window.innerWidth, H = window.innerHeight;
              const off = document.createElement('canvas');
              off.width = W; off.height = H;
              const ctx = off.getContext('2d');

              // V-OUT内の video/__mm_three_v と __mm_liq_v から再キャプチャ
              function makeVid(src) {
                if (!src) return null;
                const v = document.createElement('video');
                v.srcObject = src; v.muted = true; v.autoplay = true; v.playsInline = true;
                v.play().catch(() => {});
                return v;
              }

              const tv = document.getElementById('__mm_three_v');
              const lv = document.getElementById('__mm_liq_v');
              threeVid2 = tv && tv.srcObject ? makeVid(tv.srcObject) : null;
              liqVid2   = lv && lv.srcObject ? makeVid(lv.srcObject) : null;

              try {
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
              } catch(e) { console.warn('[REC] audio unavailable', e); }

              function compose() {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, W, H);
                ctx.globalCompositeOperation = 'source-over';

                const liqShowing = lv && lv.style.display !== 'none';
                if (!liqShowing && threeVid2 && threeVid2.readyState >= 2) {
                  ctx.drawImage(threeVid2, 0, 0, W, H);
                }
                if (liqShowing && liqVid2 && liqVid2.readyState >= 2) {
                  ctx.drawImage(liqVid2, 0, 0, W, H);
                }

                // p5 オーバーレイ
                const p5cv = document.getElementById('__mm_p5_cv');
                if (p5cv && p5cv.width > 0) {
                  ctx.globalCompositeOperation = 'screen';
                  ctx.drawImage(p5cv, 0, 0, W, H);
                  ctx.globalCompositeOperation = 'source-over';
                }

                rafId2 = requestAnimationFrame(compose);
              }
              compose();

              const videoStream = off.captureStream(30);
              const tracks = [...videoStream.getTracks()];
              if (audioStream) tracks.push(...audioStream.getTracks());
              const combined = new MediaStream(tracks);

              const mimeType = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']
                .find(m => MediaRecorder.isTypeSupported(m)) || '';

              recorder = new MediaRecorder(combined, mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : {});
              chunks = [];
              recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
              recorder.onstop = () => {
                cleanup();
                const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                const ts   = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
                a.href = url; a.download = 'vout-' + ts + '.webm'; a.click();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
                btn.textContent = 'REC';
                btn.style.background = 'transparent';
                btn.style.borderColor = 'rgba(255,255,255,0.3)';
                btn.style.color = 'rgba(255,255,255,0.5)';
              };
              recorder.start(1000);
              btn.textContent = 'STOP';
              btn.style.background = '#ff4444';
              btn.style.borderColor = '#ff4444';
              btn.style.color = '#fff';
            }

            btn.addEventListener('click', () => {
              if (recorder && recorder.state === 'recording') {
                recorder.stop(); recorder = null;
              } else {
                startRec();
              }
            });

            // ボタンをbodyに追加（body確定後）
            function appendBtn() {
              if (document.body) { document.body.appendChild(btn); }
              else setTimeout(appendBtn, 200);
            }
            appendBtn();
          })();
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
