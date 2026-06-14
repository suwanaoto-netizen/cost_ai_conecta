import type { Line } from "./types";
import type { UploadEntry } from "../store/data";
import { FLEET } from "./masterSeed";

const VENDORS = [
  { n: "中部マツダ整備", cat: "修繕・維持費" },
  { n: "ENEOSウイング", cat: "燃料費" },
  { n: "NEXCO中日本", cat: "通行料" },
  { n: "あいおいニッセイ同和損保", cat: "保険料" },
  { n: "オリックス自動車", cat: "調達コスト" },
];
const ITEMS: Record<string, string[]> = {
  燃料費: ["軽油 給油（月次）", "アドブルー補充"],
  "修繕・維持費": ["12ヶ月点検", "オイル・エレメント交換", "タイヤ4本交換"],
  通行料: ["ETC利用料（月次）"],
  保険料: ["任意保険料（自動車保険）"],
  調達コスト: ["車両リース料（月次）"],
};

let _uid = 90000;
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/** サンプル請求書1件ぶんを生成（アップロードのデモ用）。 */
export function makeUploadEntry(name?: string): UploadEntry {
  const v = pick(VENDORS);
  const month = pick(["2026-04", "2026-05", "2026-06"]);
  const k = ri(1, 4);
  const plates = [...FLEET].sort(() => Math.random() - 0.5).slice(0, k);
  const lines: Line[] = plates.map((p) => ({
    lid: _uid++,
    item: pick(ITEMS[v.cat]),
    plate: p,
    kind: "単車",
    cat: v.cat,
    inspectedAt: `${month}-${String(ri(1, 28)).padStart(2, "0")}`,
    amount: ri(8, 40) * 2500,
    confidence: 0.96,
  }));
  return { name: name || `請求書サンプル_${v.n}_${month.replace("-", "")}.pdf`, vendor: v.n, cat: "請求書", lines };
}

export const sampleBatch = (): UploadEntry[] => Array.from({ length: 3 }, () => makeUploadEntry());
