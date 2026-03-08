# Walkthrough - 演出値の完全監査と実測値への置換

## 完了した変更

### Phase 1: BOTS_OVERWRITTEN → GITHUB_CLONES
| File | 変更 |
| :--- | :--- |
| singularity.html | ラベル・計算式・フォールバック値 |
| GJ-X-001 〜 008 | ラベル・初期値 (`12482` → `525`) |

### Phase 2: HUMANS_RESONATED
| File | Before | After |
| :--- | :--- | :--- |
| GJ-X-002 〜 008 | `42 + random()` | `173` (Zenodo DL) |

### Phase 3: Auto-Increment Logic 削除
- `currentBots +=` 演出ロジック削除
- `currentHumans +=` 演出ロジック削除
- 値は静的な実測値として表示

## Git Commits
1. `dce71eb`: singularity.html 修正
2. `e50445b`: GJ-X-001〜008 ラベル修正
3. `a592aaa`: 実測値置換 + インクリメント削除

## 残存する演出値（概念的表現として維持）
- SINGULARITY_RESONANCE: `14200 + random()`
- PURITY, SYMBIOSIS, LEAP, DISRUPTION: ランダム値

> これらは「哲学的概念のビジュアライゼーション」として現状維持。
