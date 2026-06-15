/**
 * コストモニターのグラフ用 月次サンプル時系列（デモ用に決定的生成）。
 *
 * 実データは数ヶ月分しか無いため、12ヶ月＋昨年比のグラフを成立させる目的で
 * 営業所 × コスト分類 × 車格 × 月（24ヶ月）の合成データを生成する。
 * 乱数はシードから決定的に生成するため、再レンダリングしても値は安定する。
 * 同一アルゴリズムを index.html プロトタイプにも実装しており、両者で同じ数値になる。
 */

export const SERIES_OFFICES = ["名古屋営業所", "岡崎営業所", "一宮営業所", "岐阜営業所", "四日市営業所"];
export const SERIES_CATS = ["燃料費", "修繕・維持費", "通行料", "保険料", "調達コスト", "税金"];
export const SERIES_KLASSES = ["小型", "中型", "大型", "トレーラー"];

/** 営業所ごとの折れ線色。 */
export const OFFICE_COLORS: Record<string, string> = {
  名古屋営業所: "#1E55C8",
  岡崎営業所: "#157F73",
  一宮営業所: "#B87514",
  岐阜営業所: "#6B4FA3",
  四日市営業所: "#C0392B",
};

export interface MonthCell {
  ym: string; // "YYYY-MM"
  office: string;
  cat: string;
  klass: string;
  amount: number;
}

// 最新データ月（2026-06）を末尾に、24ヶ月分を生成する。
const END_Y = 2026;
const END_M = 6;

function buildMonths(): string[] {
  const out: string[] = [];
  // 末尾から23ヶ月遡る
  let y = END_Y;
  let m = END_M - 23;
  while (m <= 0) { m += 12; y -= 1; }
  for (let i = 0; i < 24; i++) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

export const SERIES_MONTHS = buildMonths();
export const PREV_YEAR_MONTHS = SERIES_MONTHS.slice(0, 12); // 昨年同期
export const THIS_YEAR_MONTHS = SERIES_MONTHS.slice(12); // 直近12ヶ月

const OFFICE_BASE: Record<string, number> = {
  名古屋営業所: 3_200_000,
  岡崎営業所: 1_800_000,
  一宮営業所: 1_500_000,
  岐阜営業所: 1_200_000,
  四日市営業所: 2_100_000,
};
const CAT_SHARE: Record<string, number> = {
  燃料費: 0.34, "修繕・維持費": 0.24, 通行料: 0.13, 保険料: 0.1, 調達コスト: 0.11, 税金: 0.08,
};
const KLASS_SHARE: Record<string, number> = {
  小型: 0.18, 中型: 0.34, 大型: 0.33, トレーラー: 0.15,
};

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
// mulberry32 — シードから決定的な疑似乱数を返す。
function rand(seed: number): number {
  let a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function buildSeries(): MonthCell[] {
  const cells: MonthCell[] = [];
  SERIES_MONTHS.forEach((ym, i) => {
    const moY = +ym.slice(5, 7); // 1..12
    const trend = 1 + 0.005 * i; // 緩やかな増加（昨年同月比 ≈ +6%）
    SERIES_OFFICES.forEach((office) => {
      SERIES_CATS.forEach((cat, ci) => {
        const phase = ci * 1.0;
        const seasonal = 1 + 0.12 * Math.sin((2 * Math.PI * (moY - 1)) / 12 + phase);
        SERIES_KLASSES.forEach((klass) => {
          const noise = 0.9 + 0.2 * rand(hashSeed(`${ym}|${office}|${cat}|${klass}`));
          const raw = OFFICE_BASE[office] * CAT_SHARE[cat] * KLASS_SHARE[klass] * seasonal * trend * noise;
          cells.push({ ym, office, cat, klass, amount: Math.round(raw / 1000) * 1000 });
        });
      });
    });
  });
  return cells;
}

export const MONTHLY_SERIES = buildSeries();

/** 月ラベル（"M月"）。 */
export const monthShort = (ym: string) => `${+ym.slice(5, 7)}月`;

/**
 * 棒グラフ①用：指定営業所（"all"＝全社）について、各月のコスト分類別合計を返す。
 */
export function stackByMonth(office: string): { ym: string; byCat: Record<string, number>; gross: number }[] {
  return SERIES_MONTHS.map((ym) => {
    const byCat: Record<string, number> = {};
    let gross = 0;
    for (const c of MONTHLY_SERIES) {
      if (c.ym !== ym) continue;
      if (office !== "all" && c.office !== office) continue;
      byCat[c.cat] = (byCat[c.cat] || 0) + c.amount;
      gross += c.amount;
    }
    return { ym, byCat, gross };
  });
}

/**
 * 折れ線グラフ②用：指定コスト分類・車格（"all"＝全車格）について、
 * 営業所ごとの直近12ヶ月の推移を返す。
 */
export function officeLines(cat: string, klass: string): { office: string; color: string; points: { ym: string; amount: number }[] }[] {
  return SERIES_OFFICES.map((office) => ({
    office,
    color: OFFICE_COLORS[office],
    points: THIS_YEAR_MONTHS.map((ym) => {
      let amount = 0;
      for (const c of MONTHLY_SERIES) {
        if (c.ym !== ym || c.office !== office || c.cat !== cat) continue;
        if (klass !== "all" && c.klass !== klass) continue;
        amount += c.amount;
      }
      return { ym, amount };
    }),
  }));
}
