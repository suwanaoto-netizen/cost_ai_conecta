import type { Document, Line, DocStatus } from "./types";
import { FLEET } from "./masterSeed";
import { DEFAULT_CATEGORIES } from "./settings";

/**
 * 書類・明細のデモデータ生成（プロトタイプの決定論ジェネレータを移植）。
 * baselineDocs（全車両の連携済み燃料費）＋ genDocs ＋ genMultiDocs を同順で生成し、
 * docs / lines（外部キー docId）に組み立てる。連携済み明細は凍結する。
 */

let _rng = 20260601;
const rnd = () => {
  _rng = (_rng * 1103515245 + 12345) & 0x7fffffff;
  return _rng / 0x7fffffff;
};
const pick = <T>(a: T[]): T => a[Math.floor(rnd() * a.length)];
const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const sample = <T>(arr: T[], k: number): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
};

let _uid = 300;
const L = (item: string, plate: string, cat: string, date: string, amount: number, conf = 0.97): Line => ({
  lid: _uid++,
  item,
  plate: plate || "",
  kind: "単車",
  cat,
  inspectedAt: date,
  amount,
  confidence: conf,
});

const GEN_ITEMS: Record<string, string[]> = {
  燃料費: ["軽油 給油（月次）", "ガソリン 給油（月次）", "アドブルー補充"],
  "修繕・維持費": ["継続車検 / 24ヶ月点検", "12ヶ月点検", "オイル・エレメント交換", "ブレーキパッド交換", "バッテリー交換", "タイヤ4本交換", "スタッドレス組替", "フロントバンパー交換", "左サイドパネル板金塗装"],
  通行料: ["ETC利用料（月次）", "高速道路利用料"],
  保険料: ["自賠責保険料", "任意保険料（自動車保険）"],
  調達コスト: ["車両リース料（月次）", "車両ローン返済"],
  税金: ["自動車税", "重量税"],
};

const GEN_VENDORS: { n: string; cat: string[] }[] = [
  { n: "中部マツダ整備", cat: ["修繕・維持費"] },
  { n: "トヨタL&F中部", cat: ["修繕・維持費"] },
  { n: "東海ふそう", cat: ["修繕・維持費"] },
  { n: "三河冷機サービス", cat: ["修繕・維持費"] },
  { n: "オートバックス法人", cat: ["修繕・維持費"] },
  { n: "中日本ボデー", cat: ["修繕・維持費"] },
  { n: "コバック車検", cat: ["修繕・維持費"] },
  { n: "ENEOSウイング", cat: ["燃料費"] },
  { n: "出光リテール販売", cat: ["燃料費"] },
  { n: "NEXCO中日本", cat: ["通行料"] },
  { n: "あいおいニッセイ同和損保", cat: ["保険料"] },
  { n: "東京海上日動火災保険", cat: ["保険料"] },
  { n: "オリックス自動車", cat: ["調達コスト"] },
  { n: "三菱HCキャピタル", cat: ["調達コスト"] },
  { n: "愛知県自動車税事務所", cat: ["税金"] },
];

interface SeedDoc {
  name: string;
  vendor: string;
  status: DocStatus;
  lines: Line[];
  category?: string;
}

function baselineDocs(): SeedDoc[] {
  const out: SeedDoc[] = [];
  const vendors = ["ENEOSウイング", "出光リテール販売", "ホクブトランスポート給油", "コスモ石油法人"];
  for (let i = 0, vi = 0; i < FLEET.length; i += 7, vi++) {
    const plates = FLEET.slice(i, i + 7);
    const vn = vendors[vi % vendors.length];
    out.push({
      name: `燃料費まとめ_${vn}_202604.pdf`,
      vendor: vn,
      status: "連携済み",
      lines: plates.map((p) => L("軽油 給油（4月分）", p, "燃料費", "2026-04-30", ri(18, 26) * 2500, 0.96)),
    });
  }
  return out;
}

function genDocs(n: number): SeedDoc[] {
  const out: SeedDoc[] = [];
  const months = ["2026-02", "2026-03", "2026-04", "2026-05"];
  for (let i = 0; i < n; i++) {
    const v = pick(GEN_VENDORS);
    const cat = pick(v.cat);
    const month = pick(months);
    const date = `${month}-${String(ri(1, 28)).padStart(2, "0")}`;
    const plate = pick(FLEET);
    const item = pick(GEN_ITEMS[cat]);
    const lines = [L(item, plate, cat, date, ri(8, 40) * 2500, 0.97)];
    if (rnd() < 0.22) lines.push(L(pick(GEN_ITEMS[cat]), plate, cat, date, ri(6, 24) * 2000, 0.96));
    const r = rnd();
    const status: DocStatus = r < 0.62 ? "連携済み" : r < 0.82 ? "入力済み" : "未入力";
    out.push({ name: `${cat}_${v.n}_${plate}_${month.replace("-", "")}.pdf`, vendor: v.n, status, lines });
  }
  return out;
}

function genMultiDocs(n: number): SeedDoc[] {
  const out: SeedDoc[] = [];
  const months = ["2026-03", "2026-04", "2026-05"];
  const pools = [
    { v: "ENEOSウイング", cat: "燃料費", items: ["軽油 給油（月次）"], label: "燃料費まとめ" },
    { v: "NEXCO中日本", cat: "通行料", items: ["ETC利用料（月次）"], label: "ETC利用料まとめ" },
    { v: "中部マツダ整備", cat: "修繕・維持費", items: GEN_ITEMS["修繕・維持費"], label: "月次整備まとめ" },
    { v: "オートバックス法人", cat: "修繕・維持費", items: ["タイヤ4本交換", "スタッドレス組替"], label: "タイヤ一括" },
    { v: "あいおいニッセイ同和損保", cat: "保険料", items: GEN_ITEMS["保険料"], label: "任意保険まとめ" },
  ];
  for (let i = 0; i < n; i++) {
    const p = pick(pools);
    const month = pick(months);
    const k = ri(5, 10);
    const plates = sample(FLEET, k);
    const lines = plates.map((pl) => L(pick(p.items), pl, p.cat, `${month}-${String(ri(1, 28)).padStart(2, "0")}`, ri(8, 30) * 2500, 0.96));
    const r = rnd();
    const status: DocStatus = r < 0.45 ? "連携済み" : r < 0.72 ? "入力済み" : "未入力";
    out.push({ name: `${p.label}_${p.v}_${month.replace("-", "")}.pdf`, vendor: p.v, status, lines });
  }
  return out;
}

const maxLineDate = (lines: Line[]) => lines.map((l) => l.inspectedAt).sort().slice(-1)[0] ?? "";

export interface SeededData {
  docs: Document[];
  lines: Line[];
}

/** 全シードを組み立てて返す。連携済み明細は凍結済み。 */
export function seedDocuments(): SeededData {
  const seeds = [...baselineDocs(), ...genDocs(34), ...genMultiDocs(14)];
  const docs: Document[] = [];
  const lines: Line[] = [];
  let no = 1101;
  seeds.forEach((s) => {
    const id = "d" + (docs.length + 1);
    const reflectedAt = s.status === "連携済み" ? maxLineDate(s.lines) + " 09:00:00" : null;
    const category = s.category || DEFAULT_CATEGORIES[docs.length % DEFAULT_CATEGORIES.length];
    docs.push({ id, no: no++, name: s.name, vendor: s.vendor, cat: "請求書", status: s.status, category, reflectedAt, deleted: false });
    s.lines.forEach((l) => {
      l.docId = id;
      if (s.status === "連携済み") Object.freeze(l); // 連携済み明細は不変
      lines.push(l);
    });
  });
  return { docs, lines };
}
