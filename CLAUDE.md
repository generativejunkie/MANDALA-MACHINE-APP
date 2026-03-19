# MANDALA-MACHINE-APP — AI Agent Collaboration Guide

このファイルはClaude Code / Google AntiGravity (Gemini) が連携して開発を進めるための共有指示書です。

---

## 役割分担

| エージェント | 担当 |
|-------------|------|
| **Claude Code** | ファイル編集・実装・git操作・Electron再起動 |
| **Google AntiGravity (Gemini)** | 設計・アルゴリズム・仕様策定・大規模コンテキスト分析 |

**基本フロー**: Geminiが仕様を設計 → Claudeが`mandaramachine.html`に実装 → Claudeがcommit/push

---

## プロジェクト概要

- **アプリ種別**: Electron + WebGL マンダラVJアプリ
- **主要ファイル**: `mandaramachine.html`（単一ファイル、約5000行）
- **起動**: `npm run app`
- **デプロイ**: `git push origin main`（Vercelへ自動デプロイ）

---

## アーキテクチャの絶対ルール

### コアエンジンは編集不可
`assets/index-*.js`（各3.9MB、Minify済み）は**絶対に触らない**。

中身: Three.js + p5.js + MandalaEngine + WebGLシェーダー。すべて難読化済みで解読不能。

### カスタム機能の追加方法
コアエンジンの上に**Canvas2Dオーバーレイ**または**CSS**で重ねる。

```
HTMLに <canvas> や <div> を追加 → position:absolute/fixed → z-index で重ねる
```

### 公開API（`window.mandalaMachine`経由でのみ操作可）
```javascript
mm.setGlobalEffect('noise', true/false)
mm.setSpeedMultiplier(1.0)
mm.setSizeMultiplier(1.0)
mm.setBlinkingMode(true/false)
mm.setBlinkingSpeed(n)
window._liquidBassIntensity  // 読み取り専用: Bass強度 0〜1
```

---

## レイヤー構成（z-index順）

```
p5-container       z:5  ← p5スケッチ（ユーザー操作）
liquidCanvas       z:4  ← 液体シェーダーオーバーレイ
reverseCanvas      z:3  ← REVERSEモード専用Canvas
canvasContainer    z:2  ← 3DマンダラエンジンのWebGLキャンバス
blackoutOverlay    z:1  ← 暗転オーバーレイ
```

---

## 実装済みカスタム機能

### REVERSEモード（Implosion）
- Canvas2D overlay（`#reverseCanvas`）
- キャンバス外周（対角線の1.25倍）からパーティクルをスポーン
- 距離比例の引力 + 中心80px以内でダンピング
- BASS rising-edge（>0.65）で大量バースト
- `globalCompositeOperation: 'lighter'`で加算合成

### PIXモード（コードレイン）
- `mm.processingLayer.drawPixelText` をパッチして差し替え
- フォントマスク: Canvas2Dで1000×200ビットマップ生成（monospace）
- POS: ドット位置にコード文字を描画
- NEG: グリッドビットマップでテキスト外にコードレイン + テキスト内にMercury White（`t.rect()`）

### PIX NEG sub-toggle
- `window._pixNegMode = true/false`
- `window.clearPixCache()` でキャッシュクリア

### DAT STROBE sub-toggle
- `strobeFlash` div（`mix-blend-mode:difference`）
- BASS rising-edge検出でフラッシュ

### RAVEN fill
- `#canvasWrapper.raven-fill-mode #canvasContainer canvas { transform: scale(1.6) }`

---

## エフェクトボタンの監視方法

`data-effect="..."` のボタンはエンジン内部でラジオセレクターとして動作する。
クリックイベントではなく **MutationObserver** で `active` クラスを監視すること。

```javascript
new MutationObserver(() => { /* active クラスの変化を処理 */ })
  .observe(btn, { attributes: true, attributeFilter: ['class'] });
```

---

## 削除済み機能（復活させない）

- **GLT（グリッチ）** — 意図せず起動する問題があり削除
- **MOSAIC** — 削除済み

---

## 現在のUIパネル構成

### トップバー（左→右）
`RESET` / `AUDIO` / `REVERSE` / `RAVEN` / `AUTO` / `BPM` / 各種スライダー

### RA-CHANGパネル（テキストエフェクト）
- Row1: `ON` `OFF` `WHT` `BLK`
- エフェクト: `WRP` `MIN` `FLT` `LIQ` `SCN` `HEX` `PIX` `[NEG]` `DAT` `[STR]`

### WHT/BLK ボタンのactive状態
- グロー禁止。`border-color: #00ffcc; outline: 2px solid #00ffcc` で示す。

---

## 開発ワークフロー

```
1. Gemini が仕様・コードを設計
2. Claude Code に「実装して」と伝える（コードを貼り付けてもよい）
3. Claude が mandaramachine.html を編集
4. 「再起動して」→ Claude が npm run app を実行
5. 動作確認後「デプロイしてプッシュして」→ Claude が commit + push
```

---

## 注意事項

- 常に**日本語**で応答・コメントを記述
- コミットメッセージは英語OK
- `node_modules/` は触らない
- `.env` やシークレット情報はコミットしない
