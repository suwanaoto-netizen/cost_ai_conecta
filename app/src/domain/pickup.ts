import type { Vehicle } from "./vehicles";

/**
 * ピックアップ（要確認車両／コスト上位車両／コスト増加車両）の算出ロジック。
 * 表示（Pickup.tsx）とアラート判定（alerts.ts）で同一の数式を共有し、乖離を防ぐ。
 */

export type PickupListId = "attention" | "topcost" | "increase";

export const PICKUP_LABEL: Record<PickupListId, string> = {
  attention: "要確認車両",
  topcost: "コスト上位車両",
  increase: "コスト増加車両",
};

const ymOf = (d: string) => (d || "").slice(0, 7);

/** 明細が持つ取引月のうち、最新月（lastYM）と前月（prevYM）。 */
export function pickupMonths(vehicles: Vehicle[]): { lastYM: string; prevYM: string } {
  const moList = [...new Set(vehicles.flatMap((v) => v.lines).map((l) => ymOf(l.date)).filter(Boolean))].sort();
  return { lastYM: moList[moList.length - 1] || "", prevYM: moList[moList.length - 2] || "" };
}

/** 指定車両の指定月の合計金額。 */
export function vSum(v: Vehicle, ym: string): number {
  return ym ? v.lines.reduce((a, l) => a + (ymOf(l.date) === ym ? +l.amount || 0 : 0), 0) : 0;
}

const pct = (c: number, p: number) => (p > 0 ? ((c - p) / p) * 100 : 0);

export interface PickupLists {
  topCost: Vehicle[]; // 累計上位3
  incRank: { v: Vehicle; p: number }[]; // 前月比増加（降順）
  maintRank: { v: Vehicle; r: number }[]; // 整備費比率（降順）
  lastYM: string;
  prevYM: string;
}

/** 3種のランキングをまとめて算出（表示・アラート共通）。 */
export function computePickup(vehicles: Vehicle[]): PickupLists {
  const { lastYM, prevYM } = pickupMonths(vehicles);
  const topCost = [...vehicles].sort((a, b) => b.total - a.total).slice(0, 3);
  const incRank = vehicles
    .map((v) => ({ v, p: pct(vSum(v, lastYM), vSum(v, prevYM)) }))
    .filter((x) => vSum(x.v, prevYM) > 0 && x.p > 0)
    .sort((a, b) => b.p - a.p);
  const maintRank = vehicles
    .map((v) => ({ v, r: v.total > 0 ? (v.byCat["修繕・維持費"] || 0) / v.total : 0 }))
    .filter((x) => x.r > 0)
    .sort((a, b) => b.r - a.r);
  return { topCost, incRank, maintRank, lastYM, prevYM };
}

/** 各リストの「順序付きメンバー車両キー」。アラートの変化検知のベースライン。 */
export interface PickupSnapshot {
  attention: string[];
  topcost: string[];
  increase: string[];
}

export const EMPTY_PICKUP: PickupSnapshot = { attention: [], topcost: [], increase: [] };

export function pickupSnapshot(vehicles: Vehicle[]): PickupSnapshot {
  const { topCost, incRank, maintRank } = computePickup(vehicles);
  const attention = [topCost[0]?.key, incRank[0]?.v.key, maintRank[0]?.v.key].filter(Boolean) as string[];
  return {
    attention,
    topcost: topCost.map((v) => v.key),
    increase: incRank.slice(0, 3).map((x) => x.v.key),
  };
}
