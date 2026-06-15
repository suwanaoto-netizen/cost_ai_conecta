/**
 * 自検協データ（車台番号 → 車格・諸元）の擬似突合。プロトタイプから移植。
 * 車台番号の型式コードから車格を判定し、最大積載量・車両総重量・サイズを引き当てる。
 */

export function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Klass = "小型" | "中型" | "大型" | "トレーラー";

interface ClassSpec {
  klass: Klass;
  /** 細分類（1t/2t/3t/4t/増トン/10t）。トレーラーは細分類なし＝空文字。 */
  sub: string;
  maxLoad: number;
  gross: number;
  size: string;
}

const JIKEN_MODELS: { code: string; emi: string; model: string; spec: ClassSpec }[] = [
  { code: "FD", emi: "2RG", model: "FDA10", spec: { klass: "小型", sub: "1t", maxLoad: 1500, gross: 3490, size: "4.69 × 1.69 × 1.98 m" } },
  { code: "FE", emi: "2RG", model: "FEAV0", spec: { klass: "小型", sub: "2t", maxLoad: 2000, gross: 4965, size: "4.69 × 1.69 × 1.98 m" } },
  { code: "FG", emi: "2KG", model: "FGA30", spec: { klass: "中型", sub: "3t", maxLoad: 3000, gross: 6985, size: "7.55 × 2.20 × 3.00 m" } },
  { code: "FK", emi: "2KG", model: "FK71F", spec: { klass: "中型", sub: "4t", maxLoad: 3800, gross: 7985, size: "8.18 × 2.29 × 3.10 m" } },
  { code: "FU", emi: "QPG", model: "FU54VZ", spec: { klass: "大型", sub: "増トン", maxLoad: 8200, gross: 14995, size: "9.99 × 2.49 × 3.50 m" } },
  { code: "FS", emi: "2PG", model: "FS70HZ", spec: { klass: "大型", sub: "10t", maxLoad: 13600, gross: 24795, size: "11.99 × 2.49 × 3.78 m" } },
  { code: "FP", emi: "QKG", model: "FP54VDR", spec: { klass: "トレーラー", sub: "", maxLoad: 24000, gross: 35980, size: "12.00 × 2.49 × 3.78 m（トラクタ）" } },
];

/** 車番から決定論的に車台番号を生成（登録車両のシード用）。 */
export function genChassis(plate: string): string {
  const h = hash(plate);
  const m = JIKEN_MODELS[h % JIKEN_MODELS.length];
  const serial = 500000 + (h % 480000);
  return `${m.emi}-${m.model}-${serial}`;
}

function modelFromChassis(chassis: string): (typeof JIKEN_MODELS)[number] | null {
  const up = (chassis || "").replace(/\s/g, "").toUpperCase();
  if (up.length < 2) return null;
  for (const m of JIKEN_MODELS) if (up.includes(m.code)) return m;
  return null;
}

export interface JikenkyoSpec {
  klass: Klass;
  /** 細分類（トレーラーは空文字）。 */
  subClass: string;
  maxLoad: number;
  gross: number;
  size: string;
}

/** 車台番号から車格・諸元を引く。該当なしは null。 */
export function lookupJikenkyo(chassis: string): JikenkyoSpec | null {
  const m = modelFromChassis(chassis);
  if (!m) return null;
  const h = hash((chassis || "").toUpperCase());
  return { klass: m.spec.klass, subClass: m.spec.sub, maxLoad: m.spec.maxLoad + (h % 5) * 100, gross: m.spec.gross, size: m.spec.size };
}

/** 車格の表示ラベル。「大分類 / 細分類」（細分類が無ければ大分類のみ）。 */
export function klassLabel(klass: string, subClass: string): string {
  if (!klass) return "";
  return subClass ? `${klass} / ${subClass}` : klass;
}

/** ナンバープレートの地名から営業所を推定（一致がなければ空）。 */
export function officeFromPlate(plate: string, categories: string[]): string {
  const m = String(plate || "").match(/^[^0-9]+/);
  const city = m ? m[0] : "";
  return categories.find((c) => city && c.startsWith(city)) ?? "";
}

/** kg 表示の整形。 */
export function fmtKg(n: number | null | undefined): string {
  if (n == null || isNaN(+n)) return "";
  return Number(n).toLocaleString("ja-JP") + " kg";
}
