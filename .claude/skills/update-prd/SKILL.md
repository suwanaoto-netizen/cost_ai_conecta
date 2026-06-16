---
name: update-prd
description: AI Fleet Pilot の PRD（docs/PRD.md）を現行実装に同期し、画面キャプチャを挿入して印刷版HTML・配布用PDFを再生成する。「PRDを最新にして」「PRDを作成して」「PRDにキャプチャを挿入して」「仕様書を更新して」などのとき使う。docs/PRD.md・docs/PRD-print.html・docs/AI_Fleet_Pilot_PRD.pdf・docs/img/ を成果物とする。
---

# update-prd — PRD の更新・キャプチャ・PDF化

AI Fleet Pilot（物流DXアプリ）の PRD を、**現行の React 実装（`app/`）に合わせて更新**し、
**実画面のキャプチャを挿入**して、**印刷版HTML と配布用PDF を再生成**するための手順。

## 成果物（すべて `docs/`）
- `PRD.md` … 仕様の正（Markdown・画面キャプチャ入り）
- `img/*.png` … 実アプリのスクリーンショット（図版）
- `PRD-print.html` … 画像を base64 埋め込みした自己完結の印刷版
- `AI_Fleet_Pilot_PRD.pdf` … 配布用PDF（A4）
- 生成ツール: `build-print.mjs`（MD→HTML）, `capture-screens.cjs`（撮影）, `html-to-pdf.cjs`（HTML→PDF）

## 進め方

### 0. 差分の把握（最新化の場合は必須）
- `git fetch origin main` で最新を取得し、`git log --oneline <branch>..origin/main` で未取込のコミットを確認。
  必要なら `git merge origin/main` で取り込む（PRD.md は本ブランチでのみ編集されるため通常コンフリクトしない）。
- 直近コミットのタイトルから新機能を洗い出す。

### 1. PRD.md を現行実装に同期
仕様の正は **`app/src/`**。PRD.md と実装の差分を埋める。特に次を実コードで確認して反映する:
- ドメイン型: `app/src/domain/types.ts`（Document/Line/Adjustment/ManualLine/VehicleMaster/Alert 等）
- 純関数ロジック: `app/src/domain/`（`match.ts` 突合 / `vehicles.ts` 集計 / `adjustments.ts` 実効値 /
  `repairSubcat.ts` 内訳 / `reflect.ts` 連携プラン / `monthlySeries.ts` グラフ /
  `pickup.ts` ピックアップ / `duplicates.ts` 重複 / `alerts.ts` 連携アラート）
- 画面: `app/src/components/views/`（Documents/CostMonitor/Master/Settings）と
  `app/src/components/{documents,costmonitor,master,settings,common}/`、`Topbar.tsx`（ベル）、`Sidebar.tsx`
- 状態/永続化: `app/src/store/`（`app.ts`・`data`・`settings`・`selectors`、`localStorage` キー）

更新時は: 冒頭に「改訂メモ — rev. YYYY-MM-DD」を追記し、`最終更新` 日付とフッタ日付も同日へ更新する。
用語表（§2）・データモデル（§2.3 の TS 型）・画面仕様（§4）・業務ルール（§5）・状態管理（§6）・
API想定（§8）・付録A（関数↔UI）を、対応箇所すべてで揃える。

### 2. 画面キャプチャを撮影（実アプリ）
egress では `cdn.playwright.dev` がブロックされるため、**npm 配布の Chromium** を使う。

```bash
cd app
npm install                                   # 依存（未インストールなら）
npm install -D @sparticuz/chromium puppeteer-core   # 撮影用（コミットしない）
npm run build                                 # tsc -b 込み。型エラーがないことも確認
npx vite preview --port 4173 --host 127.0.0.1 >/tmp/preview.log 2>&1 &
sleep 3; curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:4173/   # 200 を確認
cd ..  # リポジトリ直下へ
BASE_URL=http://127.0.0.1:4173/ node docs/capture-screens.cjs   # → docs/img/*.png
```
（`capture-screens.cjs`・`html-to-pdf.cjs` は依存を `app/node_modules` から解決するため、どの cwd からでも実行できる）

`capture-screens.cjs` はサイドバー展開・各ビュー遷移・モーダル展開を自動操作し、9点を撮る
（書類一覧/詳細パネル/アップロード/コストモニター/個別モニター/車両カルテ/連携アラート/マスタ/設定）。
**新しい画面を増やす/UI構造が変わったら、このスクリプトのセレクタ・遷移を更新する**こと。
連携アラートは初期状態が空のため、図版用サンプルを `localStorage('alerts.v1')` に投入してから撮る。
撮った PNG は `Read` ツールで開いて内容を必ず目視確認する。

### 3. PRD.md に図を挿入
各画面セクションの直後に Markdown 画像を1行で置く（キャプションは alt に書く。`build-print.mjs` が figure 化）:
```
![図N. 〈画面名〉 — 〈要点〉。](img/0X-xxxx.png)
```

### 4. 印刷版HTML と PDF を再生成（リポジトリ直下で）
```bash
node docs/build-print.mjs     # docs/PRD.md → docs/PRD-print.html（画像を base64 埋め込み）
node docs/html-to-pdf.cjs     # docs/PRD-print.html → docs/AI_Fleet_Pilot_PRD.pdf
```
`build-print.mjs` は自前の軽量 Markdown 変換（見出し/表/コード/引用/箇条書き/画像）。
生成後は次を検証する: 開閉タグの一致（`<table>`/`</table>`, `<li>`/`</li>`, `<ul|ol>`/`</ul|ol>`）、
`<figure>` 数＝挿入図数、`data:image` 数＝図数、最終更新日付の反映。
PDF は先頭 `%PDF-`、末尾 `%%EOF`、ページ数（`/Type /Page`）で妥当性を確認。

### 5. 後片付け・コミット
- 撮影用に入れた依存はコミットしない: `git checkout -- app/package.json app/package-lock.json`
- コミット対象: `docs/PRD.md docs/PRD-print.html docs/AI_Fleet_Pilot_PRD.pdf docs/img docs/*.cjs docs/build-print.mjs README.md`
- 指定ブランチへコミット＆プッシュ（PR はユーザー明示時のみ）。生成PDFは `SendUserFile` で共有してよい。

## メモ
- デスクトップ幅前提のアプリ。撮影ビューポートは幅 1340・`deviceScaleFactor:2`。縦は画面ごとに調整済み。
- ブラウザ無し環境では §2 を飛ばし、PRD.md の文章更新と `build-print.mjs` までは可能（図は前回の `docs/img` を流用）。
- 画像 base64 埋め込みのため HTML/PDF は数MB になる。軽量化が必要なら撮影の `deviceScaleFactor` を 1〜1.5 に。
