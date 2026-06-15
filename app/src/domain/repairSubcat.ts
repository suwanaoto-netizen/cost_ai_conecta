/**
 * コスト分類の内訳（サブ分類）。
 * 画面上のコスト分類はそのまま（例「修繕・維持費」「燃料費」）とし、外部サービス連携で
 * 必要となる内訳を、このモジュールが定義する安定コード（code）で内部保持する。
 * label は表記ゆれに弱いため、連携キーには必ず code を用いること。
 *
 * 親コスト分類ごとに「内訳マスタ（code↔label）」と「判定キーワード（優先順位順）」を持つ。
 */

export const REPAIR_CAT = "修繕・維持費";
export const FUEL_CAT = "燃料費";
export const INSURANCE_CAT = "保険料";

export interface Subcat {
  code: string;
  label: string;
}

/** 燃料費の内訳マスタ。 */
export const FUEL_SUBCATS: readonly Subcat[] = [
  { code: "diesel", label: "軽油" },
  { code: "adblue", label: "尿素水[AdBlue]" },
  { code: "gasoline", label: "ガソリン" },
  { code: "additive", label: "添加剤" },
] as const;

/** 修繕・維持費の内訳マスタ。 */
export const REPAIR_SUBCATS: readonly Subcat[] = [
  { code: "inspect_shaken", label: "定期点検(車検)" },
  { code: "inspect_3m", label: "定期点検(3ヵ月)" },
  { code: "inspect_other", label: "定期点検(その他)" },
  { code: "repair", label: "修理" },
  { code: "tire", label: "タイヤ" }, // タイヤ/スタッドレス/チューブ/バルブ/ホイール関連部品
  { code: "oil", label: "オイル" }, // エンジンオイル/フィルター/LLC/ウォッシャー液/グリス/ブレーキフルード
  { code: "battery", label: "バッテリー" },
  { code: "wash", label: "洗車・美装関連" }, // 洗車用品/ワックス/シャンプー/車内清掃/ウエス
  { code: "onboard", label: "車載用品" }, // 電球/ヒューズ/ワイパーゴム/発煙筒/軍手/荷締めゴム
  { code: "consumable", label: "ドライバー利用消耗品" },
] as const;

/** 保険料の内訳マスタ。 */
export const INSURANCE_SUBCATS: readonly Subcat[] = [
  { code: "jibaiseki", label: "自賠責保険" },
  { code: "voluntary", label: "任意保険" },
] as const;

/** 親コスト分類 → 内訳マスタ。 */
export const SUBCATS_BY_CAT: Record<string, readonly Subcat[]> = {
  [FUEL_CAT]: FUEL_SUBCATS,
  [REPAIR_CAT]: REPAIR_SUBCATS,
  [INSURANCE_CAT]: INSURANCE_SUBCATS,
};

const LABEL_BY_CODE: Record<string, string> = Object.fromEntries(
  Object.values(SUBCATS_BY_CAT).flatMap((arr) => arr.map((s) => [s.code, s.label])),
);

interface KeywordRule {
  code: string;
  keywords: string[];
}

/**
 * 親コスト分類 → 品名判定キーワード（データ）。
 * 配列順がそのまま判定の優先順位（上＝具体的、下＝一般的）。
 * 内訳マスタ（SUBCATS_BY_CAT）の表示順とは独立に管理する。
 * keywords は item に対する部分一致（includes）で評価される。
 */
const KEYWORDS_BY_CAT: Record<string, KeywordRule[]> = {
  [FUEL_CAT]: [
    { code: "adblue", keywords: ["アドブルー", "ＡｄＢｌｕｅ", "AdBlue", "adblue", "尿素水", "尿素"] },
    { code: "additive", keywords: ["添加剤", "アディティブ", "清浄剤"] },
    { code: "gasoline", keywords: ["ガソリン", "レギュラー", "ハイオク", "無鉛"] },
    { code: "diesel", keywords: ["軽油", "ディーゼル"] },
  ],
  [REPAIR_CAT]: [
    // 定期点検は具体的→一般的の順。車検＞3ヵ月点検＞その他点検。
    { code: "inspect_shaken", keywords: ["車検"] },
    { code: "inspect_3m", keywords: ["3ヶ月", "３ヶ月", "3ヵ月", "３ヵ月", "3カ月", "３カ月", "3か月", "３か月"] },
    { code: "inspect_other", keywords: ["点検"] },
    { code: "battery", keywords: ["バッテリ"] },
    { code: "tire", keywords: ["タイヤ", "スタッドレス", "チューブ", "ホイール", "バルブ"] },
    { code: "oil", keywords: ["オイル", "エレメント", "フィルタ", "ＬＬＣ", "LLC", "クーラント", "ウォッシャ", "グリス", "フルード"] },
    { code: "wash", keywords: ["洗車", "ワックス", "シャンプー", "清掃", "ウエス", "美装"] },
    { code: "onboard", keywords: ["電球", "ヒューズ", "ワイパー", "発煙筒", "軍手", "荷締"] },
    { code: "repair", keywords: ["修理", "交換", "板金", "塗装", "バンパー", "パネル", "ベルト", "ガス補充", "整備"] },
  ],
  [INSURANCE_CAT]: [
    // 「自賠責」「自動車損害賠償責任保険」→ 自賠責保険。それ以外の保険関連はフォールバックの任意保険。
    { code: "jibaiseki", keywords: ["自賠責", "自動車損害賠償責任保険"] },
  ],
};

/** いずれのキーワードにも当たらなかった場合のフォールバック内訳。 */
const FALLBACK_BY_CAT: Record<string, string> = {
  [FUEL_CAT]: "diesel", // 物流車両は軽油が主のため既定を軽油に寄せる
  [REPAIR_CAT]: "consumable",
  [INSURANCE_CAT]: "voluntary", // 自賠責以外の保険関連は任意保険に寄せる
};

/** その分類が内訳を持つか。 */
export function hasSubcat(cat: string): boolean {
  return !!KEYWORDS_BY_CAT[cat];
}

/** 品名から内訳コードを推定する（その分類のフォールバックを既定値とする）。 */
export function inferSubcat(cat: string, item: string): string | undefined {
  const rules = KEYWORDS_BY_CAT[cat];
  if (!rules) return undefined;
  const it = item ?? "";
  return rules.find((r) => r.keywords.some((k) => it.includes(k)))?.code ?? FALLBACK_BY_CAT[cat];
}

/** 内訳コード → 表示ラベル（未知コードはコードをそのまま返す）。 */
export function subcatLabel(code?: string | null): string {
  if (!code) return "";
  return LABEL_BY_CODE[code] ?? code;
}

/**
 * 明細の内訳コードを決定する。
 * 内訳を持たない分類では undefined。
 */
export function resolveSubcat(cat: string, item: string): string | undefined {
  return hasSubcat(cat) ? inferSubcat(cat, item) : undefined;
}

/* ───── 後方互換エイリアス（既存呼び出し・テスト向け） ───── */
/** @deprecated resolveSubcat を使用 */
export const inferRepairSubcat = (item: string): string => inferSubcat(REPAIR_CAT, item)!;
/** @deprecated subcatLabel を使用 */
export const repairSubcatLabel = subcatLabel;
/** @deprecated resolveSubcat を使用 */
export const resolveRepairSubcat = (cat: string, item: string): string | undefined => resolveSubcat(cat, item);
