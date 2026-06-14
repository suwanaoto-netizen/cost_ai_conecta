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

type Klass = "小型" | "中型" | "大型";

const JIKEN_CLASSES: Record<Klass, { maxLoad: number; gross: number; size: string }> = {
  小型: { maxLoad: 2000, gross: 4965, size: "4.69 × 1.69 × 1.98 m" },
  中型: { maxLoad: 3800, gross: 7985, size: "8.18 × 2.29 × 3.10 m" },
  大型: { maxLoad: 13600, gross: 24795, size: "11.99 × 2.49 × 3.78 m" },
};

const JIKEN_MODELS = [
  { code: "FE", emi: "2RG", model: "FEAV0", klass: "小型" as Klass },
  { code: "FK", emi: "2KG", model: "FK71F", klass: "中型" as Klass },
  { code: "FS", emi: "2PG", model: "FS70HZ", klass: "大型" as Klass },
  { code: "FU", emi: "QPG", model: "FU54VZ", klass: "大型" as Klass },
];

/** 車番から決定論的に車台番号を生成（登録車両のシード用）。 */
export function genChassis(plate: string): string {
  const h = hash(plate);
  const m = JIKEN_MODELS[h % JIKEN_MODELS.length];
  const serial = 500000 + (h % 480000);
  return `${m.emi}-${m.model}-${serial}`;
}

function classFromChassis(chassis: string): Klass | null {
  const up = (chassis || "").replace(/\s/g, "").toUpperCase();
  if (up.length < 2) return null;
  for (const m of JIKEN_MODELS) if (up.includes(m.code)) return m.klass;
  return null;
}

export interface JikenkyoSpec {
  klass: Klass;
  maxLoad: number;
  gross: number;
  size: string;
}

/** 車台番号から車格・諸元を引く。該当なしは null。 */
export function lookupJikenkyo(chassis: string): JikenkyoSpec | null {
  const klass = classFromChassis(chassis);
  if (!klass) return null;
  const base = JIKEN_CLASSES[klass];
  const h = hash((chassis || "").toUpperCase());
  return { klass, maxLoad: base.maxLoad + (h % 5) * 100, gross: base.gross, size: base.size };
}

/** ナンバープレートの地名から営業所を推定（一致がなければ空）。 */
export function officeFromPlate(plate: string, categories: string[]): string {
  const m = String(plate || "").match(/^[^0-9]+/);
  const city = m ? m[0] : "";
  return categories.find((c) => city && c.startsWith(city)) ?? "";
}

/** kg 表示の整形。 */
export function fmtKg(n: number | "" | null | undefined): string {
  if (n === "" || n == null || isNaN(+n)) return "";
  return Number(n).toLocaleString("ja-JP") + " kg";
}
