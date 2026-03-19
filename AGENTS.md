# MANDALA-MACHINE-APP — Instructions for Google AntiGravity

このファイルはGoogle AntiGravity（Gemini）が本プロジェクトを理解し、Claude Codeと連携して開発を進めるための指示書です。最初に必ず読んでください。

---

## あなたの役割

あなた（Gemini）は**設計・仕様策定・アルゴリズム設計**を担当します。
実際のファイル編集・git操作・Electron再起動は**Claude Code**が行います。

### 連携フロー
```
あなたが設計する → ユーザーがClaudeに「実装して」と伝える → Claudeが実装・push
```

コードを書いた場合は、ユーザーがそのままClaudeに貼り付けて渡せる形式にしてください。

---

## プロジェクト概要

| 項目 | 内容 |
|------|------|
| アプリ種別 | Electron + WebGL マンダラVJアプリ |
| 主要ファイル | `mandaramachine.html`（単一ファイル、約5000行） |
| 起動 | `npm run app` |
| デプロイ | `git push origin main` → Vercel自動デプロイ |
| オーナー | generativejunkie |

---

## 絶対に守るルール

### 1. `assets/index-*.js` は触らない

```
assets/index-ZIWAKdY2.js  (3.9MB)
assets/index-yNbL08Vv.js  (3.9MB)
...
```

これらはVite/Rollupでビルドされた**Minify・難読化済み**のコアエンジンです。
Three.js + p5.js + MandalaEngine + WebGLシェーダーがすべて1行に圧縮されており、**解読・編集は不可能**です。GLSLフラグメントシェーダーもこの中に含まれているため、シェーダーコードの変更はできません。

### 2. すべてのカスタム機能は `mandaramachine.html` に追加する

コアエンジンの上に**Canvas2Dオーバーレイ**または**CSS**で重ねる方式のみ使用可能。

```html
<!-- 正しい追加方法 -->
<canvas id="myOverlay" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:4;"></canvas>
```

### 3. エンジンとの通信は公開APIのみ

```javascript
const mm = window.mandalaMachine;

// 使用可能なAPI
mm.setGlobalEffect('noise', true/false)
mm.setSpeedMultiplier(1.0)       // 速度倍率
mm.setSizeMultiplier(1.0)        // サイズ倍率
mm.setBlinkingMode(true/false)   // 点滅モード
mm.setBlinkingSpeed(n)           // 点滅速度

// 読み取り専用グローバル
window._liquidBassIntensity      // Bass強度 0〜1（オーディオ解析値）
```

---

## ファイル構成（重要なもののみ）

```
MANDALA-MACHINE-APP/
├── mandaramachine.html     ← 全カスタム実装はここ
├── CLAUDE.md               ← Claude Code用指示書
├── AGENTS.md               ← このファイル（Gemini用）
├── assets/
│   └── index-*.js          ← コアエンジン（触らない）
├── js/
│   └── modules/            ← 補助モジュール
├── main.js                 ← Electronメインプロセス
└── package.json
```

---

## mandaramachine.html の構造

```
[CSS スタイル定義]
  ├── UIコンポーネントスタイル
  ├── RAVEN fillモード CSS
  ├── WHT/BLK ボタンスタイル
  └── sub-toggle スタイル

[HTML UI]
  ├── トップバー（RESET/AUDIO/REVERSE/RAVEN/AUTO/BPM/スライダー）
  ├── canvasWrapper（メインキャンバス領域）
  │   ├── canvasContainer（コアエンジンのWebGLキャンバス）
  │   ├── reverseCanvas（REVERSEオーバーレイ）
  │   └── strobeFlash div
  └── RA-CHANGパネル（テキストエフェクトUI）

[SVG フィルター定義]
  └── filter-noise

[JavaScript ブロック群]
  ├── setupFilterButtons()   ← NOISEフィルター管理
  ├── AudioSync              ← Bass/Treble解析
  ├── setupAdvancedOverlays() ← RAVEN + REVERSE実装
  ├── PIX CODE RAIN          ← drawPixelTextパッチ
  ├── PIX NEG + DAT STROBE   ← sub-toggle実装
  └── AUTO mode              ← 自動DJシステム
```

---

## レイヤー構成（z-index）

```
z:9997  strobeFlash（DATストロボ白フラッシュ）
z:5     p5-container（p5スケッチ）
z:4     liquidCanvas（液体シェーダー）
z:3     reverseCanvas（REVERSEパーティクル）
z:2     canvasContainer（3D WebGLエンジン）
z:1     blackoutOverlay（暗転）
```

---

## 実装済みカスタム機能

### REVERSEモード — Perimeter-to-Center Implosion

```javascript
// キャンバス外周（対角線の1.25倍）からパーティクルをスポーン
const outerR = Math.sqrt(cx*cx + cy*cy) * 1.25;
const angle = Math.random() * Math.PI * 2;
// スポーン座標は canvas の外側
x = cx + Math.cos(angle) * outerR * (1.0 + Math.random() * 0.25);

// 引力: 遠いほど強い
const pull = 0.07 + (dist / Math.max(W, H)) * 0.28;

// 中心80px以内でダンピング（行き過ぎ防止）
if (dist < 80) { p.vx *= 0.80; p.vy *= 0.80; }

// BASS rising-edge でバースト（25〜70パーティクル）
if (bass > 0.65 && _revLastBass <= 0.65) spawnRevPerimeter(25 + bass*45, 1 + bass*1.5);

// レンダリング: globalCompositeOperation = 'lighter'（加算合成）
```

### PIXモード — コードレイン文字

```javascript
// p5のdrawPixelTextをパッチして差し替え
mm.processingLayer.drawPixelText = function(t, n, r) { ... }

// フォントマスク生成（Canvas2D、1000×200px、monospace）
// POS: ドット位置にコード文字を描画（テキスト形に）
// NEG: グリッドビットマップでテキスト外にコードレイン
//      テキスト内は Mercury White (210,225,255) の rect で塗りつぶし

// NEG モードの切り替え
window._pixNegMode = true/false;
window.clearPixCache();  // テキスト変更時はキャッシュクリア必須
```

### DAT STROBEモード
```javascript
// BASS rising-edge（>0.65）でフラッシュ
strobeFlash.style.opacity = '1';
setTimeout(() => strobeFlash.style.opacity = '0', 80);
// mix-blend-mode: difference で白反転
```

### RAVEN fillモード
```css
#canvasWrapper.raven-fill-mode #canvasContainer canvas {
  transform: scale(1.6) !important;
  transform-origin: center center !important;
}
```

---

## エフェクトボタンの重要な動作仕様

`data-effect="..."` のボタン群（WRP/MIN/FLT/LIQ/SCN/HEX/PIX/DAT）は**エンジン内部でラジオセレクターとして動作**します。

- クリックイベントで `active` を自分で付与しても、エンジンが上書きします
- **正しい監視方法**: MutationObserver で `active` クラスの変化を検知

```javascript
const btn = document.querySelector('[data-effect="pixel"]');
new MutationObserver(() => {
  const isActive = btn.classList.contains('active');
  // isActive に応じた処理
}).observe(btn, { attributes: true, attributeFilter: ['class'] });
```

---

## UIの現在の構成

### トップバー
```
[RESET] [AUDIO] [REVERSE] [RAVEN] [AUTO] [BPM: __] [Speed __] [Size __] [Blur __]
```

### RA-CHANGパネル（テキストエフェクト）
```
Row1: [ON] [OFF] [WHT] [BLK]
Row2: [WRP] [MIN] [FLT] [LIQ] [SCN] [HEX] [PIX] [NEG*] [DAT] [STR*]
      (* = sub-toggle: 破線枠の小さいボタン)
```

### ボタンスタイルの方針
- アクティブ状態: グロー禁止。`border-color: #00ffcc; outline: 2px solid #00ffcc` のみ
- WHT: 白背景 + 黒文字。active時は cyan outline
- BLK: 黒背景 + 白文字。active時は cyan outline

---

## 削除済み機能（提案・実装しないこと）

| 機能 | 理由 |
|------|------|
| GLT（グリッチ） | 意図せず起動する問題 → 削除済み |
| MOSAIC | 削除済み |

---

## AUTOモードの仕様

自動DJシステム。タイムライン制御でモード・エフェクト・速度を自動切り替えする。

```
フェーズ: INTRO → FLOW → BUILD → PEAK → RESET → FLOW → ...
CLIMAXトリガー: ランダムタイミングで全エフェクトON + 速度2.5x + サイズ2x
FX_SLOTS: noise のみ（mosaic/glitch は削除済み）
```

---

## 開発時の注意

1. **「再起動して」** → Claudeが `pkill electron && npm run app` を実行
2. **「デプロイしてプッシュして」** → Claudeが `git add / commit / push` を実行
3. コードを提案する場合は**差し替えるべき既存コードの特徴的な文字列**も一緒に示すとClaudeが編集しやすい
4. 新機能のCanvas overlayは必ず `#canvasWrapper` の**子要素**として追加（`position:absolute`）
5. `position:fixed` は使わない（キャンバス外にはみ出す）

---

## よくある実装パターン

### 新しいオーバーレイを追加する場合
```html
<!-- HTML: canvasWrapper内に追加 -->
<canvas id="newOverlay" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:4;display:none;"></canvas>
```
```javascript
// JS: 専用の setup 関数を script タグで追加
(function setupNewOverlay() {
  const cvs = document.getElementById('newOverlay');
  const ctx = cvs?.getContext('2d');
  let raf = null, active = false;

  function loop() { ... requestAnimationFrame(loop); }

  function setActive(on) {
    active = on;
    cvs.style.display = on ? 'block' : 'none';
    if (on) loop(); else { cancelAnimationFrame(raf); ctx.clearRect(0,0,cvs.width,cvs.height); }
  }

  document.getElementById('triggerBtn')?.addEventListener('click', function() {
    setActive(this.classList.contains('active'));
  });
})();
```
