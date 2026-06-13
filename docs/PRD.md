# AI Fleet Pilot — プロダクト要求仕様書（PRD / フロントエンド設計向け）

> 請求書のデータ化（AI-OCR）と、車両（車番）単位のコスト自動集計・「ロジポケ」連携を行う、物流事業者向け Web アプリケーション。
> 本書はフロントエンドを実装するための仕様書であり、画面・コンポーネント・状態・ドメインモデル・業務ルールを定義する。

- 対象読者: フロントエンドエンジニア / デザイナー / PdM
- 現状: 単一HTMLファイル（`index.html`, Vanilla JS）による動作プロトタイプが存在。本書はそれを正とし、再実装（例: React/Vue）またはリファクタリングの基準とする。
- 最終更新: 2026-06-13

---

## 1. プロダクト概要

### 1.1 背景・課題
物流事業者は、燃料・整備・通行料・保険・税金など、車両ごとに多種多様な請求書を受け取る。これらを手作業で会計・車両コスト管理システムに転記する負荷が高く、入力ミス・集計漏れ・車両単位の原価可視化の遅れが発生している。

### 1.2 解決策
1. 請求書（PDF/画像/CSV）をアップロードすると **AI-OCR** が明細を自動データ化する。
2. 明細の **車番（ナンバープレート）を車両マスタと自動突合**し、既存車両への紐付け／新規車両作成を判定する。
3. 担当者が内容を確認・修正して「入力済み」にし、車両コスト管理システム **「ロジポケ」へ反映**する。
4. 反映済みデータから **車両（車番）単位のコストを自動集計**し、コストモニターで可視化する。

### 1.3 コアバリュー
- 転記レス: OCR＋突合で入力を自動化。
- 車両原価の可視化: 1車番＝1レコードで常に最新の積み上げを表示。
- 監査性: 反映済みデータの編集は変更履歴（いつ・誰が・何を・どう変えたか）として記録。

### 1.4 想定ユーザー
- 物流事業者の経理・総務・配車担当者（PC利用が主、デスクトップ幅前提）。
- 複数営業所をまたいで書類・コストを管理する。

---

## 2. 用語・ドメインモデル

| 用語 | 説明 |
|---|---|
| 書類 (Document) | アップロードした請求書1枚＝1レコード。複数の明細を内包する。 |
| 明細 (Line) | 書類内の1行。項目・対象車両（車番）・コスト分類・発生日・金額・読み取り信頼度を持つ。 |
| コスト分類 (Category / cat) | 費用の会計区分。`燃料費 / 修繕・維持費 / 通行料 / 保険料 / 調達コスト / 税金`（設定で追加・削除可）。 |
| 書類タイプ (DocType) | `請求書 / 見積書 / 領収書 / 納品書 / 明細書 / 保険証券 / 納付書`。コスト分類ごとに想定タイプを設定可能。 |
| 営業所 (Office / CATEGORIES) | 書類に紐付く拠点。書類一覧・コストモニターの絞り込み軸。設定で管理。 |
| 車両マスタ (Vehicle Master) | 車番・車台番号・車両コード・諸元（最大積載量・総重量・サイズ・車格）を持つ登録車両。突合の真実源。 |
| 突合 (Match) | 明細の車番を車両マスタと照合し、状態（既存/新規/要確認/未選択）を判定すること。 |
| 自検協データ | 車台番号から車格・諸元を引く外部参照（プロトタイプではローカル擬似DB `lookupJikenkyo`）。 |
| ロジポケ (Logipoke) | 反映先の車両コスト管理システム。API連携（エンドポイント＋APIキー）。 |
| 反映 (Reflect) | 入力済み書類のコストをロジポケ＝コストモニターへ確定計上すること。 |
| 変更履歴 (Changelog) | 反映済みコストへの編集差分の監査ログ。 |

### 2.1 ステータス（書類）
書類は次の順に進む。
```
未入力 → 入力済み → 反映済み
```
| ステータス | 意味 | UI |
|---|---|---|
| 未入力 (st-todo) | 取込直後。取引先・車番・金額などの確認・修正が必要。 | ドット付きチップ |
| 入力済み (st-done) | 内容を確認・確定済み。ロジポケへ反映可能。 | ドット付きチップ |
| 反映済み (st-reflected) | コストへ反映済み。書類一覧では**編集不可（🔒）**。修正はコストモニターから。 | 鍵アイコン付きチップ |

### 2.2 突合状態（明細）
`matchOf(line)` が信頼度しきい値（既定85%、設定可）と車両マスタを用いて判定する。

| 状態 | 条件 | バッジ表記 | 色 |
|---|---|---|---|
| existing | 車番が車両マスタに存在 | 既存車両に紐付け | teal |
| new | 車番が未登録 かつ 信頼度 ≥ しきい値 | 新規車両を作成 | amber |
| suspect | 信頼度 < しきい値 | 要確認：読み取り疑い | alert(赤) |
| missing | 車番が空 | 対象車両が未選択 | gray |

### 2.3 データモデル（型定義の指針）

```ts
type Document = {
  id: string;            // "d12"
  no: number;            // 表示用通番（新しいほど大）
  name: string;          // ファイル名
  vendor: string;        // 取引先
  cat: DocType;          // 書類タイプ（既定: "請求書"）
  status: "未入力" | "入力済み" | "反映済み";
  category: string;      // 営業所（空文字＝未選択）
  reflectedAt: string | null; // "YYYY-MM-DD HH:mm:ss"
  deleted: boolean;      // ゴミ箱フラグ
  lines: Line[];         // 内包明細（永続層では別テーブル lines[docId] でも可）
};

type Line = {
  lid: number;           // 明細ID
  item: string;          // 項目名
  plate: string;         // 車番（ナンバープレート）
  kind: "単車";          // 車両種別（拡張余地）
  cat: Category;         // コスト分類
  inspectedAt: string;   // 発生日 "YYYY-MM-DD"
  amount: number;        // 金額（税抜 or 明細額）
  confidence: number;    // OCR信頼度 0..1
  fuso?: {               // 車両諸元の付帯情報（任意）
    body: string; reefer: string; digitacho: boolean; drarecorder: boolean;
  };
};

type Vehicle = {         // コストモニターの集計レコード（反映済みから動的生成）
  key: string;           // 車番ベースのキー
  target: string;        // 車番
  kind: string;
  total: number;         // 期間内コスト合計
  lines: VehLine[];      // 集約された明細（doc由来 / manual手動）
};

type VehicleMaster = {
  no: number; plate: string; chassis: string; code: string;
  name: string; note: string;
  maxLoad: number | "";  // 最大積載量(kg)
  grossWeight: number | ""; // 車両総重量(kg)
  size: string;          // 寸法
  klass: string;         // 車格
};

type ChangelogEntry = {
  ts: string; user: string;
  action: "変更" | "追加" | "削除" | "ゴミ箱" | "復元";
  vehKey: string; vehTarget: string; kind: string;
  item: string; cat: Category; lid: number; docId?: string;
  detail: string;        // 人間可読の差分文
};
```

---

## 3. 全体構成・デザインシステム

### 3.1 画面マップ
アプリは固定サイドナビ＋メインの **SPA**。主要ビューは4つ。

```
AppShell
├─ Sidebar（ナビ・折りたたみ可）
│   ├─ 書類一覧 (documents)      ← 「未入力」件数バッジ
│   ├─ コストモニター (vehicles)
│   ├─ マスタデータ (master)
│   └─ 設定 (settings)
├─ Topbar（パンくず / 会社名 / ユーザー）
└─ Main（選択中ビュー）
└─ Overlay層（モーダル・確認ダイアログ・トースト・右スライドパネル）
```

### 3.2 レイアウト原則
- デスクトップ前提。`body{overflow:hidden}` で全画面シェル、メイン領域内でスクロール。
- サイドバー幅: 展開 `214px` / 折りたたみ `66px`（`.side.collapsed`）。
- **情報階層の余白・文字スケール**（全画面共通の CSS 変数）:
  - `--space-key:28px`（重要: セクション境界）/ `--space-rel:16px`（関連: 見出し・カード）/ `--space-det:8px`（詳細: 行・明細）
  - `--fs-key:22px`（見出し・主要数値）/ `--fs-rel:14px`（セクション見出し）/ `--fs-det:12.5px`（行・補足）
  - 原則: **重要ほど広く、詳細ほど詰める。**

### 3.3 デザイントークン（カラー）
```
--bg:#EEF0EC  --panel:#FAFBF9  --card:#fff
--ink:#1B2330 --inkSoft:#5A6472 --inkFaint:#9AA3AD
--line:#D9DED5 --lineSoft:#E7EAE3
--green:#16A571 --greenDark:#0E7A4B --greenSoft:#E4F4EC --greenLine:#A9DDC5  // 主アクション・ブランド
--teal:#157F73 --tealSoft:#DCEFEC      // 既存突合
--blue:#2563EB --blueSoft:#E5EDFB      // 金額・燃料費
--amber:#B87514 --amberSoft:#FBEFD8    // 新規・注意
--alert:#B23A2E --alertSoft:#F7E2DF    // 要確認・削除
--slate:#1F2A37 --slateHi:#2C3A4B
```
- コスト分類カラー（`CAT_STYLE`）: 燃料費=青 / 修繕・維持費=teal / 通行料=amber / 保険料=紫 / 調達コスト=藍 / 税金=グレー。
- フォント: `Inter` + `Noto Sans JP`、数値・コードは monospace（`--mono`）。`font-feature-settings:"palt"`。

### 3.4 共通UIコンポーネント
- ボタン: `btn-green`（主アクション）/ `btn-ghost`（副）/ `btn-cancel` / `icon-btn`。
- チップ: `catpill`（分類）/ `office-chip`（営業所）/ `st`（ステータス）/ `badge`（突合）。
- フォーム: `.in`（input/select共通）、トグル `.switch/.knob`、レンジスライダー。
- ヘルプ: `?` ホバーでポップオーバー（`catHelp` / `statusHelp`）。
- ページャー: 件数選択（20/50/100）＋前後ナビ（`pager`）。
- トースト: `toast(msg, {label, fn})` — アクション付き通知（例: 反映後に「コストモニターを見る」）。
- アイコン: SVGファクトリ `I.*`（`docs/truckN/db/gear/check/truck/alert/cloud/file/...`）。色・サイズ引数を取る。

### 3.5 ナビゲーション挙動
- `setView(v)`: ビュー切替。**設定ページに未保存変更がある状態で離脱しようとすると確認ダイアログ**を挟む（`settingsDirty()` → `renderSettingsLeaveConfirm`）。
- サイドの「書類一覧」には未入力件数バッジ（0件は非表示）。
- `toggleSidebar()` で折りたたみ。

---

## 4. 画面仕様

### 4.1 書類一覧 (documents)

**目的**: 取り込んだ書類を一覧し、確認・編集・ステータス進行・反映・営業所変更・削除を行う。

**構成**:
- ページヘッダ（タイトル＋アップロードボタン）。
- ツールバー:
  - ステータスフィルタ（all / 未入力 / 入力済み / 反映済み）＋ステータスヘルプ。
  - 営業所フィルタ（`categoryFilter`）。
  - 検索ボックス（`q`: 書類名・取引先・車番・項目を対象）。
  - ゴミ箱トグル（`trash`、削除済み件数表示）。
- テーブル（`doc-body`）:
  - 列: チェックボックス / No / 書類名 / 取引先 / 営業所 / 書類タイプ（想定） / 明細件数 / 合計金額 / 発生日 / ステータス。
  - ヘッダクリックでソート（`docSort{key,dir}`）。
  - 行クリックで**右スライドの書類詳細パネル**を開く。
- ページャー（既定20件、設定で変更可）。

**選択・一括操作**（行チェック → ツールバーに一括メニュー `bulkMenu`）:
| 操作 | 対象条件 | 挙動 |
|---|---|---|
| 入力済みにする | 選択中の「未入力」 | 確認ダイアログ（件数）→ 一括で入力済みへ |
| ロジポケに反映 | 選択中の「入力済み」 | 確認ダイアログ → 反映済みへ＋トースト（コストモニター導線） |
| 営業所を変更 | 「反映済み」以外 | 営業所選択ダイアログ → 一括変更 |
| ゴミ箱へ移動 | 任意 | 確認ダイアログ → `deleted=true` |

**ルール**:
- 反映済みは営業所変更・編集不可（鍵）。
- 全選択は「現在ページ」の表示行が対象（`cb-all` の indeterminate 対応）。
- フィルタ・検索・ページ変更時は選択をクリア。

### 4.2 書類詳細パネル（右スライド）

**目的**: 1書類の内容確認・OCR結果の修正・ステータス進行。

**構成**:
- ヘッダ: No / ステータスチップ / 前後ナビ（`panelNav`、一覧の並び順で `n / N` 表示） / アクション。
- **ステッパー**（3段）: ①取込・データ化（常にdone）→ ②入力済みにする → ③ロジポケに反映。現ステータスで `current/done/todo` を切替。
- アクションボタン:
  - 「入力済み」（`savePanel`）— 未入力時に有効、反映済みでは非表示。
  - 「ロジポケに反映」（`reflectPanel`）— **入力済みのときのみ活性**（未入力時はヒント表示）。反映済みは「反映済み（日時）」バッジ。
- 書類情報フォーム: 書類名（読取専用）/ 営業所（select）/ 取引先（input）/ 書類タイプ（select、明細の分類から**想定タイプをヒント表示**）/ 書類合計。
- **明細テーブル** + 凡例（項目=緑 / 対象車両=赤 / 金額=青 でプレビュー対応）:
  - 各明細: 項目 / 車番 / コスト分類 / 発生日 / 金額 / 突合バッジ。
  - 信頼度が低い明細は要確認表示。明細の追加・削除（`pnDeleteLid` で削除確認）。
- 右側に**請求書プレビュー**（OCR読取箇所のハイライト、ズーム `pvZoom`）。
- 反映済みは全フィールド readonly/disabled。

### 4.3 アップロード（モーダル）

2タブ構成。`renderUploadModal`。

**A. 新規アップロード (`tab:new`)**
- ドラッグ&ドロップ or ファイル選択（`.pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls`、1ファイル50MBまで、最大100件）。
- 選択済みファイルはチップ表示（明細件数つき）、個別削除可。
- 「サンプル請求書を読み込む」導線。
- 営業所選択行。
- **AI-OCR トグル**（`ocr`、設定の既定値 `defaultOcr` で初期化）。
- 取込実行 → **処理プログレス**（`processing{active,pct,label}`、アニメーション）→ 一覧へ追加（新規分は `justUploaded` でハイライト）。

**B. PDF分割アップロード (`tab:split`)**
- 複数請求書が1PDFに連結されている場合に、ページ単位で分割して取り込む。
- 状態 `splitUpload{method,file,split,ocr,category,settingsOpen,pages,bulkMenu,zoom,guide}`。
- 分割設定モーダル（`renderSplitSettingsModal`）、ページズームプレビュー（`renderSplitZoom`）、分割ガイド（`renderCoach`）。

### 4.4 コストモニター (vehicles)

**目的**: 反映済み書類から車両（車番）単位でコストを自動集計・可視化。1車番＝1レコード、常に最新の積み上げ。

**構成**:
- ページヘッダ＋説明、ゴミ箱トグル（集計から除外）、**変更履歴**ボタン（未読件数バッジ）。
- 絞り込みバー: 営業所セレクト（`vehCategoryFilter`）＋**発生期間カレンダー**（`vehDateStart/End`、`renderVehCal`）。
- **サマリーKPI**（`mon-kpis`、登録データから自動算出）:
  - 登録車両数 / 先月のコスト合計（前月比トレンド↑↓） / 平均コスト（1台あたり、前月比） / 増加台数 / データ収集中台数。
  - 「先月」は直近データ月、前月比はその前月。
- **車両カードリスト**（`vehExpanded` で内訳展開）:
  - 各車両: 車番、合計、内訳（コスト分類別）、明細テーブル（`renderVehBreakdown`）。
  - 明細は **doc由来（証憑あり→👁で請求書表示）** と **手動 (`src:"manual"`、削除可)** を区別。
  - 明細は発生日・項目・分類・取引先・金額をインライン編集可。手動明細の追加（`vehAddManualLine`）。
- 期間/営業所/ゴミ箱で該当0件のときは個別の空状態メッセージ。
- ページャー（`vehPage/vehPerPage`）。

**編集と監査**:
- `openVehEdit` で編集セッション開始（スナップショット保持）。確定 `commitVehEdit` 時に差分を `CHANGELOG` へ記録（追加/変更/削除、フィールド単位で旧→新）。
- 変更履歴パネル（`renderChangelog`）: 時系列降順、各項目クリックで該当車両・該当明細へジャンプしてハイライト（`vehEditHighlight`）。

### 4.5 マスタデータ (master)

**目的**: 車両の登録・編集。突合の真実源。

**構成**:
- ページヘッダ（CSVダウンロード / 新規登録）。
- テーブル列: No / 車両番号 / 車台番号 / 車両コード / 社内名称 / 最大積載量 / 車両総重量 / サイズ / 操作（編集）。No降順。
- 行クリックまたは編集ボタンで**編集モーダル**（`renderMasterEditModal`）。
- **車台番号入力 → 自検協データ突合**（`lookupJikenkyo`）で車格・最大積載量・車両総重量・サイズを自動反映（フォーカス維持のため該当セルのみDOM更新）。
- 保存時に `syncMaster()` で突合用の車番集合 `MASTER` を同期。
- ページャー（`masterPage/masterPerPage`）。

### 4.6 設定 (settings)

**目的**: データ化・突合・ロジポケ連携・表示・マスタ周辺の設定。**保存するまで反映されない**ドラフト方式。

**カード構成**:
1. 会社情報: 自社名（プレビュー宛名・右上表示）。
2. AI-OCR・突合: 既定OCR ON/OFF、**突合の信頼度しきい値**（50〜99%スライダー、`matchThreshold`）。
3. 表示: 既定表示件数（20/50/100）。
4. 営業所の管理: チップで追加・削除（`CATEGORIES`）。
5. コスト分類と想定書類タイプ: 分類の追加・削除、分類ごとに想定書類タイプをチップでトグル（`CAT_DOCTYPES`）。
6. ロジポケ連携: エンドポイントURL / APIキー / 自動反映トグル / 接続テスト（`testLogipoke`）。
7. 車両マスタ: マスタデータページへの導線。

**ドラフト・保存挙動**:
- 編集は `settingsDraft` に蓄積。差分があると**下部に保存バー**（変更件数）。
- 「保存」→ 確認（`renderSettingsSaveConfirm`）→ 確定。「変更を破棄」で破棄。
- 未保存で他ビューへ移動しようとすると離脱確認（`renderSettingsLeaveConfirm`）。

---

## 5. 業務ルール（ステート遷移・整合性）

1. **ステータス前進のみ**: 未入力→入力済み→反映済み。反映済みは書類一覧で不可逆・編集不可。修正はコストモニター（変更履歴に記録）。
2. **反映の前提**: 反映できるのは「入力済み」のみ。未入力からは直接反映不可。
3. **コストモニターの母数**: 反映済み書類の明細のみが集計対象。ゴミ箱（車両）に入れた車両は集計から除外。
4. **突合の真実源**: `MASTER`（車番集合）。マスタ編集後は必ず `syncMaster()`。しきい値変更は突合状態（suspect判定）に即時影響。
5. **金額・合計**: 書類合計＝明細金額の総和（`docTotal`）。発生日＝明細最小日（`docDate`）。
6. **営業所**: 反映済みは変更不可。未設定は「未分類」。
7. **監査**: コストモニターでの追加・変更・削除・ゴミ箱・復元は必ず `CHANGELOG` に `ts/user/action/detail` 付きで記録。

---

## 6. 状態管理・コンポーネント設計の指針（再実装向け）

現行は単一の `state` オブジェクト＋全描画 `render()`。再実装では以下に分割推奨。

**グローバル状態**
- `view`, `collapsed`（ナビ）
- `settings`（永続設定）/ `settingsDraft`（編集中）
- ドメインデータ: `docs`, `lines`, `vehicleMaster`, `changelog`, `categories(営業所)`, `cats(分類)`, `catDocTypes`

**ビューローカル状態**
- 書類一覧: `filterStatus, categoryFilter, q, trash, selected:Set, bulkMenu, docPage, docPerPage, docSort`
- 書類詳細: `panelId, draft, pvZoom, pnDeleteLid`
- アップロード: `upload{...}`, `splitUpload{...}`
- コストモニター: `vehCategoryFilter, vehDateStart/End, vehCalOpen, vehPage, vehPerPage, vehSort, vehExpanded:Set, vehEdit*, vehTrash:Set, vehTrashView, changelog*`
- マスタ: `masterEdit, masterPage, masterPerPage`

**派生（セレクタ）**: `visibleDocs()`, `docPageInfo()`, `buildVehicles(officeFilter, range)`, `matchOf(line)`, `expectedDocTypes(doc)`。副作用なしの純関数として実装。

**コンポーネント分割（推奨）**
```
AppShell / Sidebar / Topbar
Documents/ (Toolbar, BulkBar, Table, Row, Pager)
DocumentPanel/ (Stepper, InfoForm, LineTable, InvoicePreview)
UploadModal/ (NewTab, SplitTab, Progress)
CostMonitor/ (FilterBar, PeriodCalendar, KpiCards, VehicleCard, Breakdown, ChangelogPanel)
Master/ (Table, EditModal[ChassisLookup])
Settings/ (Cards, SaveBar, Confirms)
common/ (Button, Chip, StatusChip, MatchBadge, CatPill, Switch, Pager, Toast, HelpPopover, Modal, Icon)
```

**オーバーレイ管理**: `renderOverlay()` 相当を1つのレイヤとし、排他に1モーダルを表示。確認ダイアログ群（enter/reflect/office/trash/settingsSave/settingsLeave/vehEdit/master）は共通 Modal で実装。

---

## 7. 非機能・実装メモ

- **対応環境**: モダンブラウザ（Chromium/Firefox/Safari 最新）、デスクトップ幅。レスポンシブは現状非対応（将来課題）。
- **i18n**: UI文言は日本語固定。金額は `¥` + `toLocaleString("ja-JP")`、日付は `YYYY-MM-DD`。
- **アクセシビリティ**: ヘルプは `tabindex` 対応。ボタンに `title`。色のみに依存しない（バッジにアイコン併記）。キーボード操作・focus管理は再実装で強化。
- **パフォーマンス**: 一覧はページング前提。インライン編集はフォーカス維持のため部分DOM更新（現行は `refreshDocBody` / セル単位更新）。
- **プロトタイプの割り切り**（実装時に要バックエンド化）:
  - OCR・自検協突合・ロジポケ連携・接続テストはローカル擬似実装。本番はAPI化。
  - データは初期シード＋擬似乱数生成（`SEED`, `genDocs`, `genMultiDocs`, `baselineDocs`）。永続化なし。
  - APIキー等の秘匿情報はマスク表示。実装ではサーバ側保持。

---

## 8. API連携（将来）想定エンドポイント
プロトタイプは未接続。バックエンド実装時の想定。

| 機能 | メソッド/想定 |
|---|---|
| 書類アップロード＋OCR | `POST /documents`（multipart）→ ジョブ→ 明細抽出 |
| 書類一覧/取得/更新 | `GET/PATCH /documents` |
| ステータス更新（反映） | `POST /documents/{id}/reflect` |
| 車両マスタ CRUD | `GET/POST/PATCH /vehicles` |
| 自検協突合 | `GET /chassis/{no}/spec` |
| ロジポケ連携・接続テスト | 設定の `logipokeUrl` + `logipokeKey`、`POST /integrations/logipoke/test` |
| 変更履歴 | `GET /changelog` |

---

## 付録A: 画面別アクション一覧（主要関数 ↔ UI）
プロトタイプ `index.html` の関数名を再実装時のイベント名の参考に併記。

- 書類一覧: `setView, setFilter, setCategoryFilter, setQuery, setDocSort, toggleTrash, toggleSelect(All), toggleBulkMenu, bulkMarkEntered, bulkReflect, bulkChangeOffice, bulkTrash, trashDoc, restoreDoc, setDocPage/PerPage`
- 詳細パネル: `openPanel, closePanel, panelNav, savePanel, reflectPanel, pnDoc, pnVendor, add/deleteLine`
- アップロード: `openUpload, switchUploadTab, pickFiles, handleUploadFiles, toggleOcr, setUploadCategory, useSampleFiles, runUpload`（分割系: `splitUpload*`）
- コストモニター: `setVehCategoryFilter, toggleVehCal/clearVehCal, toggleVehTrash, openVehEdit/commitVehEdit/closeVehEdit, vehAddManualLine/vehDeleteManualLine/vehEdit*Line, vehViewDoc, openChangelog/gotoChange`
- マスタ: `openMasterNew/openMasterEdit/closeMasterEdit, masterEditField, masterEditChassis(→lookupJikenkyo), saveMaster, downloadMasterCsv`
- 設定: `setSetting, toggleSetting, setMatchThreshold, setDefaultPageSize, addCategory/removeCategory, addCat/removeCat/toggleCatDocType, askSaveSettings/discardSettingsEdits, testLogipoke`
