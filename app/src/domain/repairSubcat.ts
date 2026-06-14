/**
 * 修繕・維持費の内訳（サブ分類）。
 * 画面上のコスト分類は「修繕・維持費」のままとし、外部サービス連携で必要となる
 * 内訳はこのモジュールが定義する安定コード（code）で内部保持する。
 * label は表記ゆれに弱いため、連携キーには必ず code を用いること。
 */

/** 内訳を持つ親コスト分類。 */
export const REPAIR_CAT = "修繕・維持費";

export interface RepairSubcat {
  code: string;
  label: string;
}

/**
 * 修繕・維持費の内訳マスタ。
 * code: 外部連携キー（不変）／ label: 内部表示用ラベル。
 */
export const REPAIR_SUBCATS: readonly RepairSubcat[] = [
  { code: "shaken", label: "車検" },
  { code: "inspection", label: "法定点検" },
  { code: "repair", label: "修理" },
  { code: "tire", label: "タイヤ" }, // タイヤ/スタッドレス/チューブ/バルブ/ホイール関連部品
  { code: "oil", label: "オイル" }, // エンジンオイル/フィルター/LLC/ウォッシャー液/グリス/ブレーキフルード
  { code: "battery", label: "バッテリー" },
  { code: "wash", label: "洗車・美装関連" }, // 洗車用品/ワックス/シャンプー/車内清掃/ウエス
  { code: "onboard", label: "車載用品" }, // 電球/ヒューズ/ワイパーゴム/発煙筒/軍手/荷締めゴム
  { code: "consumable", label: "ドライバー利用消耗品" },
] as const;

const LABEL_BY_CODE: Record<string, string> = Object.fromEntries(
  REPAIR_SUBCATS.map((s) => [s.code, s.label]),
);

/**
 * 品名 → 内訳コードの判定キーワード（データ）。
 * 配列順がそのまま判定の優先順位（上＝具体的、下＝一般的）。
 * REPAIR_SUBCATS の表示順とは独立に管理する。
 * keywords は item に対する部分一致（includes）で評価される。
 */
const SUBCAT_KEYWORDS: { code: string; keywords: string[] }[] = [
  { code: "shaken", keywords: ["車検"] },
  { code: "inspection", keywords: ["点検"] },
  { code: "battery", keywords: ["バッテリ"] },
  { code: "tire", keywords: ["タイヤ", "スタッドレス", "チューブ", "ホイール", "バルブ"] },
  { code: "oil", keywords: ["オイル", "エレメント", "フィルタ", "ＬＬＣ", "LLC", "クーラント", "ウォッシャ", "グリス", "フルード"] },
  { code: "wash", keywords: ["洗車", "ワックス", "シャンプー", "清掃", "ウエス", "美装"] },
  { code: "onboard", keywords: ["電球", "ヒューズ", "ワイパー", "発煙筒", "軍手", "荷締"] },
  { code: "repair", keywords: ["修理", "交換", "板金", "塗装", "バンパー", "パネル", "ベルト", "ガス補充", "整備"] },
];

/** 品名から修繕・維持費の内訳コードを推定する。未該当はドライバー利用消耗品扱い。 */
export function inferRepairSubcat(item: string): string {
  return SUBCAT_KEYWORDS.find((r) => r.keywords.some((k) => item.includes(k)))?.code ?? "consumable";
}

/** 内訳コード → 表示ラベル（未知コードはコードをそのまま返す）。 */
export function repairSubcatLabel(code?: string | null): string {
  if (!code) return "";
  return LABEL_BY_CODE[code] ?? code;
}

/**
 * 明細の内訳コードを決定する。
 * cat が修繕・維持費でなければ内訳は持たない（undefined）。
 */
export function resolveRepairSubcat(cat: string, item: string): string | undefined {
  return cat === REPAIR_CAT ? inferRepairSubcat(item) : undefined;
}
