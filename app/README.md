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
- 残りビュー（書類一覧/詳細/アップロード・コストモニター）は `views/Placeholder`。後続手順で順次実装。

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
