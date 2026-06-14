# AI Fleet Pilot — React/TypeScript 再実装

プロトタイプ（Vanilla JS 単一ファイル `../index.html`）からの段階移行プロジェクト。
本ディレクトリは (A) 再描画アーキテクチャ改善のための足場（手順1・2）。

## 現状
- **足場**: Vite + React + TypeScript + Vitest + Zustand。
- **ドメイン移植**: プロトタイプの純ロジックを副作用なしの純関数として `src/domain/` に移植し、単体テストで挙動を固定（リグレッション基準）。
  - `match.ts` — 車番正規化・突合（`normPlate` / `matchOf` / `PlateIndex` / `resolveVehicleId` / `countUnresolved`）
  - `adjustments.ts` — 連携済み明細の override 調整（不変・undo 可能）
  - `vehicles.ts` — コスト集計 `buildVehicles`（車両ID集計・override 適用）
  - `catStyle.ts` — 分類色 / ステータス / 突合バッジの表示メタ
  - `types.ts` — ドメイン型
- **共通UI + AppShell**:
  - 状態管理 `store.ts`（Zustand、セレクタ購読で部分再レンダ）。`view` / サイドバー / **overlayStack** / トースト。
  - `components/common/` — Button / StatusChip / CatPill / MatchBadge / Switch / Pager / **Modal**（フォーカストラップ・Esc・背景閉じ・aria-modal）/ OverlayHost（モーダルスタック）/ Toast / Icon。
  - `components/` — AppShell / Sidebar（折りたたみ・未入力バッジ）/ Topbar（パンくず）。
  - イベントはすべて props 束縛（インライン onclick 文字列ゼロ＝XSS構造排除）。
- **設定ビュー（移植済み）**: `views/SettingsView`。
  - ドラフト/保存方式（`store/settings.ts`）。会社情報 / AI-OCR・突合しきい値 / 表示件数 / 営業所 / コスト分類×想定書類タイプ / データ連携（ロジポケ・モビポケ・外部のタブ）/ 車両マスタ導線。
  - 未保存変更バー＋保存確認（差分一覧）＋**離脱ガード**（`nav.tsx`、overlayStack で確認）。
  - `domain/settings.ts`（dirty/diff 純関数）はテスト済み。
- **マスタデータビュー（移植済み）**: `views/MasterView` + `master/MasterEditModal`。
  - テーブル（No降順・ページャ）/ CSVダウンロード / 新規登録・編集（行クリック/編集ボタン）。
  - **車台番号 → 自検協データ突合**（`domain/jikenkyo.ts`）で車格・最大積載量・車両総重量・サイズを自動反映。制御コンポーネントのためフォーカスは自然に保持（旧コードのDOMセル更新ハック不要）。
  - 車番重複チェック・削除。`store/master.ts` がシードデータ（`domain/masterSeed.ts`）と CRUD を保持。
  - jikenkyo/seed のロジックはテスト済み。
- **コストモニター（移植済み）**: `views/CostMonitorView` + `costmonitor/*`。
  - `domain/docSeed.ts` で書類・明細のデモデータを決定論生成（連携済み明細は凍結）。`store/data.ts` が docs/lines/manualLines/adjustments/changelog/vehTrash を保持。
  - KPIカード / 営業所フィルタ / **期間カレンダー**（範囲ポップオーバー）/ 車両テーブル（内訳バー）/ ページャ。
  - **内訳編集モーダル**＝override調整UI：連携済み明細の修正は調整として記録、原本は不変（元値に戻すと調整消滅）。手動明細の追加・削除。保存時に**変更履歴**へ差分記録。
  - 変更履歴スライドパネル（未読バッジ）/ 車両のゴミ箱（確認＋履歴記録）。
- **書類一覧＋詳細パネル＋アップロード（移植済み）**: `views/DocumentsView` + `documents/*`。
  - 一覧：ステータスセグ／営業所フィルタ／検索／ゴミ箱／一括処理（入力済み・データ連携・営業所変更・ゴミ箱）／ページャ。
  - 詳細パネル：ステッパー／書類情報フォーム／明細カード（車番オートコンプリート・OCR金額候補・突合バッジ）／前後ナビ／明細削除。右側の請求書プレビューは**原本（画像そのもの）として凍結**され、左パネルの編集では変化しない（パネルを開いた時点のスナップショット）。
  - データ連携フロー：確認（要確認件数の警告）→ `ReflectLog`（①マスタ登録→②コスト書込のアニメ）→ 連携済み（明細凍結）。
  - アップロード：D&D／サンプル読込／営業所／AI-OCRトグル／進捗アニメ → 書類追加。
  - `domain/documents.ts`・`domain/reflect.ts` をテスト済み。
  - **PDF分割アップロード（移植済み）**: タブ切替・作成方法（ZIP/PDF）・デモPDF読込・分割トグル → 分割設定モーダル（ページ取込トグル・分割/結合境界・一括操作・ズーム）→ グループごとに書類作成。`domain/splitDemo.ts` はテスト済み。
- **全4ビュー＋アップロード（新規/分割）移行完了**。残：旧 `index.html` の再描画ハック撤去・curated SEED の追加・分割アップロードのガイド（コーチマーク、未移植）。

## コマンド
```bash
npm install
npm run dev        # 開発サーバ
npm test           # ドメイン単体テスト（vitest）
npm run typecheck  # 型チェック
npm run build      # 本番ビルド → dist/
```

## 今後の移行順（シェル温存・1ビューずつ）
共通UI（特に `<Modal>` と overlayStack）→ AppShell/Sidebar/Topbar →
設定 → マスタ → コストモニター → 書類一覧/詳細/アップロード → 旧再描画ハック撤去。

> 注: 成果物は単一HTMLではなくビルド物（`dist/`）。開発は `npm run dev`。
