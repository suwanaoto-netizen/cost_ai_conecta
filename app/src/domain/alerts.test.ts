import { describe, it, expect } from "vitest";
import { buildCostMap, diffAlerts, mapsEqual } from "./alerts";
import { pickupSnapshot, EMPTY_PICKUP } from "./pickup";
import type { Vehicle, VehLine } from "./vehicles";

/** 月×分類の金額表から最小限の Vehicle を組み立てる。 */
function veh(key: string, target: string, monthly: Record<string, Record<string, number>>): Vehicle {
  const lines: VehLine[] = [];
  let total = 0;
  const byCat: Record<string, number> = {};
  for (const ym of Object.keys(monthly)) {
    for (const cat of Object.keys(monthly[ym])) {
      const amount = monthly[ym][cat];
      lines.push({ lid: `${key}-${ym}-${cat}`, src: "manual", item: cat, cat, date: `${ym}-15`, amount, vendor: "", doc: "", office: "" });
      total += amount;
      byCat[cat] = (byCat[cat] || 0) + amount;
    }
  }
  return { key, kind: "単車", target, total, byCat, count: lines.length, last: "", lines, fuso: null };
}

/** cur から指定セルを除いた prev（そのセルだけ「変化あり」にする）。 */
function prevWithout(cur: Record<string, number>, ...drop: string[]) {
  const p = { ...cur };
  drop.forEach((k) => delete p[k]);
  return p;
}

const incOnly = (as: ReturnType<typeof diffAlerts>) => as.filter((a) => a.kind !== "pickup_change");

describe("buildCostMap", () => {
  it("車両×分類×月で合算する", () => {
    const v = veh("V1", "x", { "2026-05": { 燃料費: 1000, 通行料: 500 }, "2026-06": { 燃料費: 2000 } });
    const m = buildCostMap([v]);
    expect(m["V1|燃料費|2026-05"]).toBe(1000);
    expect(m["V1|通行料|2026-05"]).toBe(500);
    expect(m["V1|燃料費|2026-06"]).toBe(2000);
  });
});

describe("① 増加アラート", () => {
  it("前月比 +10%以上かつ増加額>=30,000で発火（mom/avg3重複は1件に集約）", () => {
    const v = veh("V1", "名古屋100", {
      "2026-03": { 燃料費: 100_000 },
      "2026-04": { 燃料費: 100_000 },
      "2026-05": { 燃料費: 100_000 },
      "2026-06": { 燃料費: 130_000 },
    });
    const cur = buildCostMap([v]);
    const prev = prevWithout(cur, "V1|燃料費|2026-06");
    const inc = incOnly(diffAlerts(prev, cur, EMPTY_PICKUP, pickupSnapshot([v]), [v]));
    expect(inc).toHaveLength(1);
    expect(inc[0].kind).toBe("inc_mom"); // 同率なら mom を主にする
    expect(inc[0].target.vehKey).toBe("V1");
  });

  it("比較元が minBaseAmount 未満なら発火しない（ゼロ近似除外）", () => {
    const v = veh("V2", "y", { "2026-05": { 燃料費: 10_000 }, "2026-06": { 燃料費: 25_000 } });
    const cur = buildCostMap([v]);
    const prev = prevWithout(cur, "V2|燃料費|2026-06");
    expect(incOnly(diffAlerts(prev, cur, EMPTY_PICKUP, pickupSnapshot([v]), [v]))).toHaveLength(0);
  });

  it("増加率10%でも増加額が minAbsIncrease 未満なら発火しない（少額ノイズ除外）", () => {
    const v = veh("V3", "z", { "2026-05": { 燃料費: 100_000 }, "2026-06": { 燃料費: 110_000 } });
    const cur = buildCostMap([v]);
    const prev = prevWithout(cur, "V3|燃料費|2026-06");
    expect(incOnly(diffAlerts(prev, cur, EMPTY_PICKUP, pickupSnapshot([v]), [v]))).toHaveLength(0);
  });

  it("①-bは4ヶ月未満では評価しない（2ヶ月のみでavg3は出ない）", () => {
    const v = veh("V4", "w", { "2026-05": { 保険料: 50_000 }, "2026-06": { 保険料: 90_000 } });
    const cur = buildCostMap([v]);
    const prev = prevWithout(cur, "V4|保険料|2026-06");
    const inc = incOnly(diffAlerts(prev, cur, EMPTY_PICKUP, pickupSnapshot([v]), [v]));
    expect(inc).toHaveLength(1);
    expect(inc[0].kind).toBe("inc_mom");
  });
});

describe("② ピックアップ変化", () => {
  it("新規にコスト上位車両へ入ると pickup_change が出る", () => {
    const v = veh("V1", "名古屋100", { "2026-06": { 燃料費: 200_000 } });
    const cur = buildCostMap([v]);
    const al = diffAlerts(cur, cur, EMPTY_PICKUP, pickupSnapshot([v]), [v]).filter((a) => a.kind === "pickup_change");
    expect(al.some((a) => a.target.listId === "topcost")).toBe(true);
  });
});

describe("mapsEqual", () => {
  it("キー・値の一致で判定", () => {
    expect(mapsEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(mapsEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(mapsEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });
});
