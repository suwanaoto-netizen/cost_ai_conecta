# AI Fleet Pilot — プロダクト要求仕様書（PRD / フロントエンド設計向け）

> 請求書のデータ化（AI-OCR）と、車両（車番）単位のコスト自動集計・データ連携を行う、物流事業者向け Web アプリケーション。
> 本書はフロントエンドを実装するための仕様書であり、画面・コンポーネント・状態・ドメインモデル・業務ルールを定義する。

- 対象読者: フロントエンドエンジニア / デザイナー / PdM
- 現状: 現行実装は **React + TypeScript 版（`app/`）**。本書（`docs/PRD.md`）が仕様の正であり、`legacy-prototype.html`（旧 `index.html`）は参照専用（非推奨・メンテナンス対象外）。
- 最終更新: 2026-06-15（rev.）

---

## 改訂メモ — rev. 2026-06-15（直近PRを統合）

- **コストモニターを2タブ化**：「コストモニター」（登録車両全体のサマリー＝KPI＋ピックアップ＋推移グラフ）と「個別モニター」（車両ごとの集計テーブル）に分割。
- **推移グラフを追加**：①「車両維持コスト推移（分類構成比）」＝月次12ヶ月の積み上げ棒＋昨年同月比較・営業所絞り込み。②「営業所別 コスト分類推移」＝折れ線・コスト分類／車格で絞り込み。いずれもデモ用の決定的な月次合成データ（`monthlySeries`）で描画。
- **ピックアップを追加**：要確認車両／コスト上位車両／コスト増加車両（前月比）。クリックで**車両カルテ**（読み取り専用の詳細・明細タイムライン）を開く。
- KPI・グラフの説明に「**※給与・運賃・間接費は含まれていません**」を明示（コスト分類が車両維持コストに限られることの注記）。
- **車両ID（不変キー）による安定リンク**：突合は正規化車番→車両ID（`PlateIndex`）で行い、確定時に明細へ `vehicleId` を焼き付ける。OCRの全角/半角・空白ゆらぎを `normPlate` で吸収。
- **突合状態に `existing-suspect` を追加**：既存マスタに一致するが信頼度がしきい値未満のケース（誤紐付け防止のため要確認に倒す）。
- **車両マスタに営業所・車格細分類（`subClass`：1t/2t/3t/4t/増トン/10t 等）を追加**。営業所の初期値はナンバーの地名から推定し、コスト内訳編集と双方向連動。
- 連携済み明細を `Object.freeze` で凍結。編集は追記専用の調整（override）でコスト集計のみに反映（原本不変・実効値集計・undo）。`Lid` をブランド型化し ID 生成を `mintLid` に一元化。
- 設定の「ロジポケ連携」を「データ連携」に再編（ロジポケ／モビポケ／外部サービスのタブ）。コスト分類・想定書類タイプの管理はマスタデータ（コスト分類タブ）へ移管。
- 修繕・維持費／燃料費に外部連携用の内訳（`subCat`）を内部保持。「分類＋品名」から自動判定（`KEYWORDS_BY_CAT` 部分一致・コード安定、未該当はフォールバック）。燃料費は給油量（L）・単価（円/L）手入力欄を持ち、連携タグに併記。

---

## 1. プロダクト概要

### 1.1 背景・課題
物流事業者は、燃料・整備・通行料・保険・税金など、車両ごとに多種多様な請求書を受け取る。これらを手作業で会計・車両コスト管理システムに転記する負荷が高く、入力ミス・集計漏れ・車両単位の原価可視化の遅れが発生している。

### 1.2 解決策
1. 請求書（PDF/画像/CSV）をアップロードすると **AI-OCR** が明細を自動データ化する。
2. 明細の **車番（ナンバープレート）を車両マスタと自動突合**し、既存車両への紐付け／新規車両作成を判定する。
3. 担当者が内容を確認・修正して「入力済み」にし、連携先（ロジポケ／モビポケ／外部サービス）へ **データ連携** する。
4. 連携済みデータから **車両（車番）単位のコストを自動集計**し、コストモニターで可視化する。

### 1.3 コアバリュー
- **転記レス**: OCR＋突合で入力を自動化。手作業の転記をなくす。
- **車両原価の可視化**: 1車番＝1レコードで常に最新の積み上げを表示。全社サマリー（KPI・推移グラフ）と個別車両の両面で把握。
- **監査性**: 請求書原本は不変。連携済みコストの編集は調整レイヤ＋変更履歴（いつ・誰が・何を・どう変えたか）に記録。

> 注意: 集計対象は車両ごとの維持コスト（燃料・整備・通行料・保険・調達・税金等）であり、**給与・運賃・間接費は含まない**。

### 1.4 想定ユーザー
- 物流事業者の経理・総務・配車担当者（PC利用が主、デスクトップ幅前提）。
- 複数営業所をまたいで書類・コストを管理する。

---

## 2. 用語・ドメインモデル

| 用語 | 説明 |
|---|---|
| 書類 (Document) | アップロードした請求書1枚＝1レコード。複数の明細を内包する（永続層では明細を別テーブルとし `docId` で参照）。 |
| 明細 (Line) | 書類内の1行。項目・対象車両（車番）・コスト分類・発生日・金額・読み取り信頼度を持つ。確定時に車両ID（`vehicleId`）を焼き付ける。 |
| コスト分類 (Category / cat) | 費用の会計区分。`燃料費 / 修繕・維持費 / 通行料 / 保険料 / 調達コスト / 税金`（**マスタデータ＞コスト分類タブ**で追加・削除可）。連携用の内訳コード（subCat）を派生で持つ。 |
| 内訳 (subCat / Sub-category) | コスト分類の外部連携用の細分類で、「分類＋品名」から導く従属値（分類横断）。連携キーは安定 `code`、表示は `label`。対象分類：修繕・維持費（車検／法定点検／修理／タイヤ／オイル／バッテリー／洗車・美装関連／車載用品／ドライバー利用消耗品、未該当→`consumable`）・燃料費（軽油 `diesel`／尿素水 `adblue`／ガソリン `gasoline`／添加剤 `additive`、未該当→`diesel`）。 |
| 書類タイプ (DocType) | `請求書 / 見積書 / 領収書 / 納品書 / 明細書 / 保険証券 / 納付書`。コスト分類ごとに想定タイプを設定可能（マスタで管理）。 |
| 営業所 (Office / CATEGORIES) | 書類に紐付く拠点。書類一覧・コストモニターの絞り込み軸。設定で管理。 |
| 車両マスタ (Vehicle Master) | 車番・車台番号・車両コード・営業所・諸元（最大積載量・総重量・サイズ・車格・車格細分類）を持つ登録車両。突合の真実源。営業所の初期値はナンバーの地名から推定。 |
| 突合 (Match) | 明細の車番を車両マスタと照合し、状態（既存／既存・要確認／新規／要確認／未選択）を判定すること。正規化車番→車両IDの `PlateIndex` で解決。 |
| 車両ID (vehicleId) | 車番に依存しない不変の内部キー。突合・集計の安定キーで、確定時に明細へ焼き付ける。 |
| 自検協データ | 車台番号から車格・諸元を引く外部参照（プロトタイプではローカル擬似DB `lookupJikenkyo`）。 |
| ロジポケ (Logipoke) | データ連携先の車両コスト管理システム。設定の「データ連携」カードで接続設定（エンドポイント＋APIキー）。モビポケ・外部サービスと並ぶ連携先のひとつ。 |
| モビポケ / 外部サービス | ロジポケ以外のデータ連携先。設定の「データ連携」カードのタブごとに接続設定・接続テスト・差分表示を行う。 |
| データ連携 (Reflect) | 入力済み書類のコストを連携先（ロジポケ／モビポケ／外部サービス）＝コストモニターへ確定計上すること（旧称「ロジポケに反映」）。 |
| 調整 (Adjustment / override) | 連携済み明細に対する追記専用の上書き。元データは変更せず、コスト集計にのみ適用。`ADJUSTMENTS` に蓄積（`setOverride` / `findOverride`）。 |
| 凍結 (Freeze) | 連携済み書類の明細を `Object.freeze` で不変化。請求書原本は以後変更不可。 |
| 実効値 (Effective value) | 原値に調整（override）を重ねた値。`effDocLine` が算出し、コスト集計・日付フィルタ・変更履歴の基準となる。 |
| 変更履歴 (Changelog) | 連携済みコストへの編集差分・ゴミ箱/復元の監査ログ。 |
| 車両カルテ (Karte) | 1車両の読み取り専用ビュー。コスト内訳と発生明細のタイムラインを表示。 |

### 2.1 ステータス（書類）
書類は次の順に進む。**前進のみで逆行はしない。**
```
未入力 → 入力済み → 連携済み
```
| ステータス | 意味 | UI |
|---|---|---|
| 未入力 (st-todo) | 取込直後。取引先・車番・金額などの確認・修正が必要。 | ドット付きチップ |
| 入力済み (st-done) | 内容を確認・確定済み。データ連携が可能。 | ドット付きチップ |
| 連携済み (st-reflected) | 連携システムと車両コストへデータ連携済み。書類一覧では**編集不可（🔒）**。修正はコストモニターから。 | 鍵アイコン付きチップ |

### 2.2 突合状態（明細）
`matchOf(line, plateIndex, threshold)` が信頼度しきい値（既定85%、設定可）と車両マスタ由来の `PlateIndex`（正規化車番→車両ID）を用いて判定する。車番は `normPlate`（全角→半角・空白除去）で正規化。

| 状態 | 条件 | バッジ表記 | 色 |
|---|---|---|---|
| existing | 車番がマスタに存在 かつ 信頼度 ≥ しきい値 | 既存車両に紐付け | teal |
| existing-suspect | 車番がマスタに存在 だが 信頼度 < しきい値 | 既存一致・要確認 | alert(赤) |
| new | 車番が未登録 かつ 信頼度 ≥ しきい値 | 新規車両を作成 | amber |
| suspect | 車番が未登録 かつ 信頼度 < しきい値 | 要確認：読み取り疑い | alert(赤) |
| missing | 車番が空 | 対象車両が未選択 | gray |

要確認件数（連携前のブロッカー判定）は `suspect` ＋ `existing-suspect` の合計（`countUnresolved`）。例：`三河800さ901O`（誤読・信頼度0.73）。

### 2.3 データモデル（型定義の指針）

```ts
// 書類明細の一意識別子（ブランド型）。生成は mintLid に一元化。
type Lid = string & { readonly __brand: "Lid" };

type DocStatus = "未入力" | "入力済み" | "連携済み";
type DocType = "請求書" | "見積書" | "領収書" | "納品書" | "明細書" | "保険証券" | "納付書";
type MatchState = "existing" | "existing-suspect" | "new" | "suspect" | "missing";

interface Document {
  id: string;            // "d12"
  no: number;            // 表示用通番（新しいほど大）
  name: string;          // ファイル名
  vendor: string;        // 取引先
  cat: DocType;          // 書類タイプ（既定: "請求書"）
  status: DocStatus;
  category: string;      // 営業所（空文字＝未選択）
  reflectedAt: string | null; // "YYYY-MM-DD HH:mm:ss"
  deleted: boolean;      // ゴミ箱フラグ
}

interface Line {
  lid: Lid;              // 明細ID（ブランド型）
  item: string;          // 項目名
  plate: string;         // 車番（ナンバープレート）
  kind: string;          // 車両種別 "単車"（拡張余地）
  cat: string;           // コスト分類
  subCat?: string | null;   // 内訳コード（修繕・維持費／燃料費。cat+itemから自動判定）
  liters?: number | null;   // 給油量(L)（燃料費のみ・手入力）
  unitPrice?: number | null;// 単価(円/L)（燃料費のみ・手入力）
  inspectedAt: string;   // 発生日 "YYYY-MM-DD"
  amount: number;        // 金額（税抜 or 明細額）
  confidence: number;    // OCR信頼度 0..1
  vehicleId?: string | null;// 確定時に焼き付ける安定リンク（車両ID）
  docId?: string;        // 親書類への外部キー
  fuso?: {               // 車両諸元の付帯情報（任意）
    body: string; reefer: string; digitacho: boolean; drarecorder: boolean;
  };
}

// ストア内の明細は in-place 変更禁止（必ず新オブジェクトへ差し替え）。連携済みは Object.freeze で凍結。
type FrozenLine = Readonly<Line>;

// 連携済み明細への追記専用 override（元データは不変、コスト集計のみに反映）
type Overridable = "item" | "cat" | "subCat" | "inspectedAt" | "amount";
interface Adjustment {
  id: string;
  docId: string;
  lid: Lid;
  type: "override";
  patch: Partial<Pick<Line, Overridable>>;
  ts: string; user: string;
}

// 手動明細（コストモニターで追記する証憑なしの明細）
interface ManualLine {
  id: string;
  vkey: string;          // 紐付く車両キー（車両ID / "U:正規化plate" / "未設定"）
  kind: string; target: string;
  item: string; cat: string; subCat?: string | null;
  date: string; amount: number;
  vendor: string; office: string;
}

interface VehicleMaster {
  no: number;
  id: string;            // 不変の内部車両ID（突合・集計の安定キー）
  plate: string; chassis: string; code: string;
  name: string; note: string;
  office: string;        // 営業所（初期値はナンバー地名から推定／内訳編集と双方向連動）
  maxLoad: number | null;     // 最大積載量(kg)
  grossWeight: number | null; // 車両総重量(kg)
  size: string;          // 寸法
  klass: string;         // 車格
  subClass: string;      // 車格の細分類（1t/2t/3t/4t/増トン/10t。トレーラー・未突合は空）
}

// コストモニターの集計レコード（連携済み＋手動から動的生成）
interface Vehicle {
  key: string;           // encodeVehKey: 車両ID / "U:正規化plate" / "未設定"
  kind: string;
  target: string;        // 表示車番（マスタの正規plate）
  total: number;         // 期間内コスト合計
  byCat: Record<string, number>; // コスト分類別合計
  count: number;         // 明細件数
  last: string;          // 最終発生日
  lines: VehLine[];      // 集約された明細（src: "doc" | "manual"）
  fuso: Line["fuso"] | null;
}

interface ChangelogEntry {
  ts: string; user: string;
  action: "変更" | "追加" | "削除" | "ゴミ箱" | "復元";
  vehKey: string; vehTarget: string; kind: string;
  item?: string; cat?: string;
  lid?: string;          // doc明細はLid、手動明細はManualLine.id（いずれもstring）
  docId?: string; vehTrash?: boolean;
  detail: string;        // 人間可読の差分文
}
```

---

## 3. 全体構成・デザインシステム

### 3.1 画面マップ
アプリは固定サイドナビ＋メインの **SPA**。主要ビューは4つ。

```
AppShell
├─ Sidebar（ナビ・折りたたみ可）
│   ├─ 書類一覧 (documents)      ← 「未入力」件数バッジ
│   ├─ コストモニター (vehicles)  ← [コストモニター | 個別モニター] タブ
│   ├─ マスタデータ (master)      ← [車両マスタ | コスト分類] タブ
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
- コスト分類カラー（`CAT_STYLE` / `catStyleOf`）: 燃料費=青 / 修繕・維持費=teal / 通行料=amber / 保険料=紫 / 調達コスト=藍 / 税金=グレー。
- グラフの営業所別折れ線色（`OFFICE_COLORS`）: 名古屋=青 / 岡崎=teal / 一宮=amber / 岐阜=紫 / 四日市=赤。
- フォント: `Inter` + `Noto Sans JP`、数値・コードは monospace（`--mono`）。`font-feature-settings:"palt"`。

### 3.4 共通UIコンポーネント
- ボタン: `btn-green`（主アクション）/ `btn-ghost`（副）/ `btn-cancel` / `icon-btn`。
- チップ: `catpill`（分類）/ `office-chip`（営業所）/ `st`（ステータス）/ `badge`（突合）/ `mtag`（マスタ既存/新規）。
- フォーム: `.in`（input/select共通）、トグル `.switch/.knob`、レンジスライダー。
- ヘルプ: `?` ホバーでポップオーバー（`catHelp` / `statusHelp`）。
- ページャー: 件数選択（20/50/100）＋前後ナビ（`Pager`）。
- トースト: `showToast(msg, {label, fn})` — アクション付き通知（例: データ連携後に「コストモニターを見る」）。
- グラフ: 純 SVG で描画（外部チャートライブラリ非依存）。積み上げ棒（`CostTrendBarChart`）・折れ線（`OfficeCategoryLineChart`）。
- アイコン: SVGファクトリ `Icon`（`IconTruck/IconCheck/IconAlert/IconChevron/...`）。色・サイズ引数を取る。

### 3.5 ナビゲーション挙動
- ビュー切替時、**設定ページに未保存変更がある状態で離脱しようとすると確認ダイアログ**を挟む（`settingsDirty()` → 離脱確認）。
- サイドの「書類一覧」には未入力件数バッジ（0件は非表示）。
- サイドバーの折りたたみトグル。

---

## 4. 画面仕様

### 4.1 書類一覧 (documents)

**目的**: 取り込んだ書類を一覧し、確認・編集・ステータス進行・データ連携・営業所変更・削除を行う。

**構成**:
- ページヘッダ（タイトル＋アップロードボタン）。
- ツールバー:
  - ステータスフィルタ（all / 未入力 / 入力済み / 連携済み）＋ステータスヘルプ。
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
| データ連携する | 選択中の「入力済み」 | 確認ダイアログ → 連携済みへ＋トースト（コストモニター導線） |
| 営業所を変更 | 「連携済み」以外 | 営業所選択ダイアログ → 一括変更 |
| ゴミ箱へ移動 | 任意 | 確認ダイアログ → `deleted=true` |

**ルール**:
- 連携済みは営業所変更・編集不可（鍵）。
- 全選択は「現在ページ」の表示行が対象（`cb-all` の indeterminate 対応）。
- フィルタ・検索・ページ変更時は選択をクリア。

### 4.2 書類詳細パネル（右スライド）

**目的**: 1書類の内容確認・OCR結果の修正・ステータス進行。

**構成**:
- ヘッダ: No / ステータスチップ / 前後ナビ（`panelNav`、一覧の並び順で `n / N` 表示） / アクション。
- **ステッパー**（3段）: ①取込・データ化（常にdone）→ ②入力済みにする → ③データ連携する。現ステータスで `current/done/todo` を切替。
- アクションボタン:
  - 「入力済み」（`savePanel`）— 未入力時に有効、連携済みでは非表示。
  - 「データ連携する」（`reflectPanel`）— **入力済みのときのみ活性**（未入力時は『入力済みにすると連携ボタンが押下できます』とヒント表示）。連携済みは「連携済み（日時）」バッジ。
- 書類情報フォーム: 書類名（読取専用）/ 営業所（select）/ 取引先（input）/ 書類タイプ（select、明細の分類から**想定タイプをヒント表示**）/ 書類合計。
- **明細テーブル** + 凡例（項目=緑 / 対象車両=赤 / 金額=青 でプレビュー対応）:
  - 各明細: 項目 / 車番 / コスト分類 / 発生日 / 金額 / 突合バッジ。信頼度が低い明細は要確認表示。明細の追加・削除（`pnDeleteLid` で削除確認）。
  - **内訳（連携用）**: 修繕・維持費／燃料費の明細には「コスト分類／発生日」直下に**読み取り専用**の内訳を表示。項目名・分類を編集するとその場で再判定・DOM更新（保存値と常に一致、直接編集不可）。ツールチップに連携コードを表示。
  - **給油量・単価**: 燃料費の明細のみ、給油量（L）・単価（円/L）を手入力欄として表示（`liters` / `unitPrice`）。連携タグに併記。
- 右側に**請求書プレビュー＝原本**（請求書の画像そのもの）。パネルを開いた時点のスナップショット（取引先・明細）から描画し、左パネルの編集（項目／車番／金額／取引先）では変化しない。OCR読取箇所のハイライト・ズーム（`pvZoom`）。
- **連携済み**は全フィールド readonly/disabled。明細は `Object.freeze` で凍結され、請求書原本は原値のまま不変。修正はコストモニターの調整レイヤ経由でコスト集計にのみ反映される（§4.4）。
- **データ連携ログ**（`ReflectLog`）: 連携プラン（`buildReflectPlan`）を段階表示。新規マスタ作成は high-confidence の `new` のみ、`suspect` はスキップ、`existing-suspect` は要確認付きで追記。明細には内訳タグ＋燃料情報を併記（例 `[内訳: diesel/軽油 | 120L | 155円/L]`）。

### 4.3 アップロード（モーダル）

2タブ構成。`UploadModal`。

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
- 分割設定モーダル（`SplitSettingsModal`）、ページズームプレビュー（`SplitThumbnail`）、分割ガイド。

### 4.4 コストモニター (vehicles)

画面上部のタブで **「コストモニター」** と **「個別モニター」** を切り替える。

> 共通注記: 集計対象は連携済み書類のコストで、**※給与・運賃・間接費は含まれていません**。

#### 4.4.1 コストモニタータブ（全社サマリー）

**目的**: 連携済みの書類から、登録車両全体のコスト動向を集計・俯瞰する。**絞り込みの影響を受けず常に全車両を対象**にする。

- **サマリーKPI**（`KpiCards`、登録データから自動算出）:
  - 登録車両数 / 先月のコスト合計（前月比トレンド↑↓） / 平均コスト（1台あたり、前月比） / コスト増加車両（前月比 台数） / データ収集中の車両（連携明細が2件以下）。
  - 「先月」は直近データ月、前月比はその前月。トレンドは上昇/下降/横ばいを矢印＋色で表示。
- **ピックアップ**（`Pickup`、折りたたみ可）:
  - 要確認車両（コスト上位・前月比増加・整備費比率の代表をまとめて提示）/ コスト上位車両（Top3）/ コスト増加車両（前月比、先月vs前月）。
  - 各項目クリックで**車両カルテ**（`VehKarteModal`）を開く。
- **推移グラフ**（`mon-charts`、純SVG）:
  - ①**車両維持コスト推移（分類構成比）**（`CostTrendBarChart`）: 月次・直近12ヶ月の積み上げ棒。**薄い棒＝昨年同月**で前年比較。営業所（全社/各営業所）で絞り込み。バーにコスト分類別の金額・構成比をツールチップ表示。
  - ②**営業所別 コスト分類推移**（`OfficeCategoryLineChart`）: 月次・直近12ヶ月の折れ線。コスト分類・車格（小型/中型/大型/トレーラー）で絞り込み。営業所ごとに色分け。
  - グラフのサンプル時系列はデモ用の**決定的合成データ**（`monthlySeries`：営業所×分類×車格×24ヶ月、シードから安定生成）。本番は集計APIに置換。

#### 4.4.2 個別モニタータブ（車両ごとの集計）

**目的**: 連携済み書類から車両（車番）単位でコストを自動集計・可視化。1車番＝1レコード、常に最新の積み上げ。

**構成**:
- ページヘッダ＋説明、ゴミ箱トグル（集計から除外）、**変更履歴**ボタン（未読件数バッジ）。
- 絞り込みバー: 営業所セレクト＋**発生期間カレンダー**（`PeriodCalendar`、`range{start,end}`）。
- 車両テーブル（`vt`）: 列＝車番 / マスタ（既存マスタ＝teal／新規作成＝amber の `mtag`）/ コスト内訳（分類別の構成比バー＋金額凡例）/ 最終発生・明細数 / 累計コスト / 操作（編集 / ゴミ箱 or 復元）。`total` 降順。
- 「編集」→ **コスト内訳編集モーダル**（`VehEditModal`）。車番クリック相当の導線から**車両カルテ**（`VehKarteModal`）も開ける。
- 期間/営業所/ゴミ箱で該当0件のときは個別の空状態メッセージ。ページャー（`page/perPage`）。

**集計ロジック**（`buildVehicles`）:
- 母数は**連携済み・未削除**の書類明細（override 調整適用済みの**実効値** `effDocLine`）＋手動明細（`ManualLine`）。
- 車両ID（`vehicleId` ／未確定は `resolveVehicleId(plateIndex, plate)`）をキーに積み上げ、表示車番はマスタの正規 plate（OCRゆらぎ吸収）。未登録は `U:正規化plate` で暫定集計、車番空は「未設定」。
- 期間フィルタは実効値の発生日基準。

**編集と監査（原本不変・調整レイヤ）**:
- 連携済み明細の編集は元データを書き換えず、追記専用の調整（override）として `ADJUSTMENTS` に記録（`vehEditDocLine` → `setOverride`）。請求書原本（書類詳細）は不変で、修正はコスト集計にのみ反映される。
- 実効値の適用: `buildVehicles` が原値に override を重ねた実効値（`effDocLine`）で集計。金額・分類・項目・発生日のほか、日付フィルタも実効値基準。
- 内訳の再判定: `cat`/`item` を override すると対象分類（修繕・維持費／燃料費）の内訳（subCat）を `resolveSubcat` で再判定。保存・連携時も同期。
- **undo**: フィールドを元の値に戻すと該当 override が消え、全フィールドを原状回復すると調整自体が消滅する。
- 営業所の初期値: コスト内訳編集モーダルの営業所初期値は車両マスタと連動。マスタ未設定時は明細で最多の営業所をフォールバック。編集で営業所を変更すると**車両マスタにも双方向反映**。
- 手動明細の追加（`vehAddManualLine`）・削除（証憑なし、`src:"manual"`）。
- 確定（`commitVehEdit`）時に実効値差分を `CHANGELOG` へ記録（追加/変更/削除、フィールド単位で旧→新）。ゴミ箱/復元も記録。
- 変更履歴パネル（`ChangelogPanel`）: 時系列降順、各項目クリックで該当車両・該当明細へジャンプしてハイライト。

**車両カルテ（`VehKarteModal`）**: 読み取り専用。車番＋マスタ区分、累計コスト/明細数/最終発生、コスト内訳（構成比バー＋凡例）、発生明細のタイムライン（日付降順、`請求書より自動記録`／`手動追加` を区別、取引先表示）。

### 4.5 マスタデータ (master)

**目的**: 突合・集計・連携の真実源となるマスタデータの管理。**タブ構成（車両マスタ / コスト分類）**。

**車両マスタ タブ**（`VehicleMasterPanel`）:
- ページヘッダ（CSVダウンロード / 新規登録）。
- テーブル列: No / 車両番号 / 車台番号 / 車両コード / 社内名称 / 営業所 / 最大積載量 / 車両総重量 / サイズ / 操作（編集）。No降順。
- 行クリックまたは編集ボタンで**編集モーダル**（`MasterEditModal`）。
- **営業所**フィールド（一覧・編集モーダル・CSVで設定／表示）。初期値はナンバー（車番）の地名から推定。
- **車台番号入力 → 自検協データ突合**（`lookupJikenkyo`）で車格・車格細分類（`subClass`）・最大積載量・車両総重量・サイズを自動反映（フォーカス維持のため該当セルのみDOM更新）。
- 保存時に `syncMaster()` 相当で突合用の `PlateIndex`（正規化車番→車両ID）を同期。
- ページャー（`masterPage/masterPerPage`）。

**コスト分類 タブ**（`CostCatPanel`。コスト構造のマスタ）:
- 分類ごとに行表示: コスト分類ピル（色は `catStyleOf`）/ **想定書類タイプ**（チップトグル、書類タイプのヒント・コストモニター内訳集計に使用）/ **連携用内訳コード**（`subcatsOf` から派生、参照のみ）。
- 分類の追加（ヘッダの入力＋ボタン）・削除（行末×、削除確認モーダルで連携済みデータへの影響を警告）。即時反映。
- 内訳コード（subCat）と自動判定ルールは外部連携の契約キーのため `domain/repairSubcat.ts`（`SUBCATS_BY_CAT` / `KEYWORDS_BY_CAT`）が真実源（UIからは変更不可）。

**連動**: 車両マスタの営業所はコストモニターのコスト内訳編集と双方向連動（マスタ未設定時は明細で最多の営業所をフォールバック）。

### 4.6 設定 (settings)

**目的**: データ化・突合・データ連携・表示・マスタ周辺の設定。**保存するまで反映されない**ドラフト方式。

**カード構成**:
1. 会社情報: 自社名（プレビュー宛名・右上表示）。
2. AI-OCR・突合: 既定OCR ON/OFF、**突合の信頼度しきい値**（50〜99%スライダー、`matchThreshold`）。
3. 表示: 既定表示件数（20/50/100）。
4. 営業所の管理: チップで追加・削除（`CATEGORIES`）。
5. コスト分類: マスタデータ（コスト分類タブ）への導線のみ。分類・想定書類タイプの管理はマスタへ移管。
6. データ連携: タブ切替で **ロジポケ連携 / モビポケ連携 / 外部サービス連携** を設定（`DataLinkCard`）。
   - ロジポケ連携: 有効トグル / エンドポイントURL / APIキー / 自動データ連携トグル / 接続テスト（`testLogipoke`）。
   - モビポケ連携: 有効トグル / エンドポイントURL / APIキー / 自動データ連携トグル / 接続テスト（`testMobipoke`）。
   - 外部サービス連携: 有効トグル / サービス名 / エンドポイントURL（Webhook）/ APIキー / 送信フォーマット（JSON/CSV/XML）/ 接続テスト（`testExternal`）。
7. 車両マスタ: マスタデータページへの導線。

**ドラフト・保存挙動**:
- 編集は `settingsDraft` に蓄積。差分があると**下部に保存バー**（変更件数）。
- 「保存」→ 確認（保存確認ダイアログ）→ 確定。「変更を破棄」で破棄。
- 未保存で他ビューへ移動しようとすると離脱確認。

---

## 5. 業務ルール（ステート遷移・整合性）

1. **ステータス前進のみ**: 未入力→入力済み→連携済み。連携済みは書類一覧で不可逆・編集不可。修正はコストモニター（変更履歴に記録）。
2. **連携済み明細の不変化**: 連携済み書類の明細は `Object.freeze` で凍結。請求書原本は不変で、コストモニターでの修正は追記専用の調整（override）として記録し、`buildVehicles` が実効値として集計に適用する（元の値に戻すと調整は消える）。
3. **データ連携の前提**: データ連携できるのは「入力済み」のみ。未入力からは直接データ連携できない。連携プランでは `new`（high-confidence）のみ新規マスタ作成、`suspect` はスキップ、`existing-suspect` は要確認付きで追記。
4. **コストモニターの母数**: 連携済み・未削除の書類明細（実効値）＋手動明細のみが集計対象。ゴミ箱（車両）に入れた車両は集計から除外。コストモニタータブのサマリーは絞り込みの影響を受けず全車両対象。
5. **突合の真実源**: 車両マスタ由来の `PlateIndex`（正規化車番→車両ID）。マスタ編集後は必ず同期。しきい値変更は突合状態（suspect/existing-suspect 判定）に即時影響。車番は `normPlate` で正規化（全角/半角・空白ゆらぎ吸収）。
6. **車両ID リンク**: 確定時に明細へ不変の `vehicleId` を焼き付け、車番変更に依存しない安定集計を行う。
7. **金額・合計**: 書類合計＝明細金額の総和。発生日＝明細最小日。
8. **営業所**: 連携済みは変更不可。未設定は「未分類」。車両マスタに保持し初期値はナンバー地名から推定。コスト内訳編集の初期値はマスタと連動し、マスタ未設定時は明細で最多の営業所をフォールバック。内訳編集での営業所変更はマスタにも双方向反映。
9. **内訳（subCat）の自動同期**: 修繕・維持費・燃料費の内訳は「分類＋品名」から導く従属値（`KEYWORDS_BY_CAT` 部分一致・配列順が優先、表示順と独立）。読み取り専用で直接編集不可——品名を正すことで正しい内訳へ誘導。保存・連携・override 時に再判定して永続値と一致。連携キーは表記ゆれに強い `code`、表示は `label`。未該当は分類ごとにフォールバック（修繕・維持費→`consumable`、燃料費→`diesel`）。
10. **監査**: コストモニターでの追加・変更・削除・ゴミ箱・復元は必ず `CHANGELOG` に `ts/user/action/detail` 付きで記録。
11. **マスタ削除の保護**: 連携済み明細（凍結・付け替え不可）や手動明細が紐付く車両マスタは削除を拒否（`countReflectedVehicleDocLines` / `countVehicleCostLines` で依存チェック）。

---

## 6. 状態管理・コンポーネント設計の指針

旧プロトタイプ（`legacy-prototype.html`）は単一の `state` オブジェクト＋全描画 `render()`（`innerHTML` 差し替え）に依存していた。現行の React 版では以下に分割し、全消し再描画ハック（`render` / `innerHTML` 差し替え・`_captureScroll` 等）は撤去済み。ストアは Zustand（`store/`）、ドメインロジックは純関数（`domain/`）として単体テストで固定。

**グローバル状態（ストア）**
- `view`, `collapsed`（ナビ）
- `settings`（永続設定）/ `settingsDraft`（編集中）。`live` スナップショット参照（`currentSnapshot`）。
- ドメインデータ: `docs`, `lines`（FrozenLine）, `manualLines`, `adjustments(ADJUSTMENTS：override調整・追記専用)`, `vehicleMaster`, `changelog`, `categories(営業所)`, `costCats(コスト分類マスタ：分類名＋想定書類タイプ)`, `vehTrash`
- オーバーレイ: `pushOverlay`（排他に1モーダル）、トースト（`showToast`）

**ビューローカル状態**
- 書類一覧: `filterStatus, categoryFilter, q, trash, selected:Set, bulkMenu, docPage, docPerPage, docSort`
- 書類詳細: `panelId, draft, pvZoom, pnDeleteLid`
- アップロード: `upload{...}`, `splitUpload{...}`
- コストモニター: `tab(monitor/individual), office, range, trashView, page, perPage, clogOpen`、編集系（`vehEdit*`）
- マスタ: `tab(vehicles/costCats), masterEdit, masterPage, masterPerPage`

**派生（セレクタ・純関数）**: `visibleDocs()`, `docPageInfo()`, `useVehicles()/buildVehicles(input)`, `usePlateIndex()/buildPlateIndex()`, `matchOf(line, idx, threshold)`, `countUnresolved()`, `effDocLine(line, docId, adjustments)`, `resolveSubcat(cat, item)/subcatLabel(code)/hasSubcat(cat)`, `buildReflectPlan()`, `stackByMonth()/officeLines()`（グラフ用）。いずれも副作用なし。`buildVehicles` は override を実効値として適用し、営業所初期値の解決（マスタ連動＋最多フォールバック）も純関数。

**コンポーネント分割**
```
AppShell / Sidebar / Topbar / OverlayHost
Documents/   (DocumentsView, DocumentPanel[Stepper,InfoForm,LineTable,InvoicePreview], ReflectLog,
              UploadModal[NewTab,SplitTab,Progress], SplitSettingsModal, SplitThumbnail)
CostMonitor/ (CostMonitorView[monitor|individual], KpiCards, Pickup, CostTrendBarChart,
              OfficeCategoryLineChart, VehKarteModal, VehEditModal, PeriodCalendar, ChangelogPanel)
Master/      (MasterView[vehicles|costCats], VehicleMasterPanel, CostCatPanel, MasterEditModal[ChassisLookup])
Settings/    (SettingsView, SettingCard, DataLinkCard, confirms)
common/      (Button, CatPill, StatusChip, MatchBadge, Switch, Pager, Toast, Modal, OverlayHost, Icon)
```

**オーバーレイ管理**: `OverlayHost` を1つのレイヤとし、排他に1モーダルを表示。確認ダイアログ群（enter/reflect/office/trash/settingsSave/settingsLeave/vehEdit/master）は共通 `Modal` で実装。

---

## 7. 非機能・実装メモ

- **対応環境**: モダンブラウザ（Chromium/Firefox/Safari 最新）、デスクトップ幅。レスポンシブは現状非対応（将来課題）。
- **i18n**: UI文言は日本語固定。金額は `¥` + `toLocaleString("ja-JP")`（グラフ軸は「万」表記）、日付は `YYYY-MM-DD`。
- **アクセシビリティ**: ヘルプは `tabindex` 対応。ボタンに `title`。色のみに依存しない（バッジにアイコン併記）。グラフは `role="img"` ＋ `aria-label`、要素に `<title>` ツールチップ。
- **パフォーマンス**: 一覧はページング前提。React 版はセレクタ購読＋差分描画でフォーカス維持（旧版のセル単位 DOM 更新ハックは不要）。グラフは純 SVG（外部依存なし）で、合成データは `useMemo` でメモ化。
- **リポジトリ構成**: 現行実装は React 版（`app/`：Vite + React + TypeScript + Zustand + Vitest）。`docs/PRD.md` ＝仕様（本書）、`legacy-prototype.html`（旧 `index.html`）＝参照専用（非推奨バナー付き・メンテナンス対象外）。ルート `README.md` に構成を明示。
- **プロトタイプの割り切り**（実装時に要バックエンド化）:
  - OCR・自検協突合・データ連携（ロジポケ／モビポケ／外部サービス）・接続テストはローカル擬似実装。本番はAPI化。
  - データは curated SEED を `domain/docSeed.ts` / `domain/masterSeed.ts` に定義（連携済みは凍結＝書き換え不可）。既知のOCR誤読デモ（`三河800さ901O`・信頼度0.73→suspect）や `fuso` 付き明細を含む。修繕・維持費・燃料費の明細には内訳（subCat）（燃料費は給油量・単価も）を付与。グラフは `domain/monthlySeries.ts` の決定的合成データ。永続化なし。
  - APIキー等の秘匿情報はマスク表示。実装ではサーバ側保持。

---

## 8. API連携（将来）想定エンドポイント
プロトタイプは未接続。バックエンド実装時の想定。

| 機能 | メソッド/想定 |
|---|---|
| 書類アップロード＋OCR | `POST /documents`（multipart）→ ジョブ→ 明細抽出 |
| 書類一覧/取得/更新 | `GET/PATCH /documents` |
| ステータス更新（データ連携） | `POST /documents/{id}/reflect` |
| コスト連携（POST） | `POST /costs`（`buildReflectPlan` の連携プラン。明細に内訳タグ＋給油量・単価を併記、例 `[内訳: diesel/軽油 | 120L | 155円/L]`） |
| 車両マスタ CRUD | `GET/POST/PATCH /vehicles`（`office`＝営業所、`subClass`＝車格細分類を含む） |
| 自検協突合 | `GET /chassis/{no}/spec` |
| データ連携・接続テスト | 各タブの エンドポイントURL + APIキー、`POST /integrations/{provider}/test`（`logipoke` / `mobipoke` / 外部サービス） |
| コスト調整（override） | `GET/POST /adjustments`（追記専用。連携済み明細の実効値上書き） |
| コスト集計・時系列 | `GET /costs/summary`（KPI）/ `GET /costs/series`（推移グラフ：月次×営業所×分類×車格） |
| 変更履歴 | `GET /changelog` |

---

## 付録A: 画面別アクション一覧（主要関数 ↔ UI）
旧プロトタイプ（`legacy-prototype.html`）の関数名を、React 版のイベント名の参考に併記する。

- 書類一覧: `setView, setFilter, setCategoryFilter, setQuery, setDocSort, toggleTrash, toggleSelect(All), toggleBulkMenu, bulkMarkEntered, bulkReflect, bulkChangeOffice, bulkTrash, trashDoc, restoreDoc, setDocPage/PerPage`
- 詳細パネル: `openPanel, closePanel, panelNav, savePanel, reflectPanel, pnDoc, pnVendor, add/deleteLine`
- アップロード: `openUpload, switchUploadTab, pickFiles, handleUploadFiles, toggleOcr, setUploadCategory, useSampleFiles, runUpload`（分割系: `splitUpload*`）
- コストモニター: `setTab(monitor/individual), setVehCategoryFilter, setRange/clearRange, toggleVehTrash, openKarte, openVehEdit/commitVehEdit/closeVehEdit, vehAddManualLine/vehDeleteManualLine/vehEdit*Line, vehViewDoc, openChangelog/gotoChange`、グラフ絞り込み（`office/cat/klass`）
- マスタ: `setMasterTab(vehicles/costCats), openMasterNew/openMasterEdit/closeMasterEdit, masterEditField, masterEditChassis(→lookupJikenkyo), saveMaster, downloadMasterCsv`、コスト分類（`addCat/removeCat/toggleCatDocType`）
- 設定: `setSetting, toggleSetting, setMatchThreshold, setDefaultPageSize, addCategory/removeCategory, askSaveSettings/discardSettingsEdits, testLogipoke/testMobipoke/testExternal`

---

AI Fleet Pilot — プロダクト要求仕様書（PRD / フロントエンド設計向け）　|　最終更新 2026-06-15（rev.）　|　現行は React 版（`app/`）。本書（`docs/PRD.md`）が仕様の正、`legacy-prototype.html` は参照専用。
