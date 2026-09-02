# ST Reflex Trainer 2026

2026年度 ITストラテジスト試験（B-1 / B-2）向けの、思考反射トレーナーです。
GitHub Pagesで動作する静的PWAです。サーバー・DBは不要です。

## 収録している第1版機能

- 反射2択：設問要求・概念の瞬時判定
- 因果コンボ：診断 / 戦略 / 評価 / リスクの短い因果チェーン
- 出題者意図：設問が採点したいものを逆算
- 根拠探索：本文中の答案材料をタップ
- 100点答案判定：正しそうだが弱い答案との比較
- 専門語彙：意味→識別→適用へ段階習熟
- 適応復習：正誤、回答時間、連続正解を保存
- REFLEX SCORE：正答率だけでなく速度・保持も加味
- My Case DB：B-2用の個人事例を端末内localStorageだけに保存
- CBT Simulation：B-1/B-2の入力練習
- PWA / オフライン対応

## GitHub Pages での構成

主要ファイルはすべてリポジトリ直下を正本とします。

- `index.html`
- `styles.css`
- `app.js`
- `questions.js`
- `glossary.js`
- `manifest.webmanifest`
- `sw.js`
- `icons/`

`index.html` と Service Worker はルート直下の `questions.js` / `glossary.js` を読み込みます。
同じデータファイルを別フォルダへ重複配置しない運用にしています。

## 重要

`My Case DB` に入力した個人事例は localStorage にのみ保存され、このアプリからGitHubへ送信しません。
ブラウザデータを削除すると消えるため、将来版ではエクスポート/インポートを追加予定です。

## 問題データ

`questions.js` を追加・修正すれば問題を増やせます。
専門用語は `glossary.js` で管理します。
第1版はアプリ構造と学習体験を確認するため、すべてオリジナル練習問題です。
