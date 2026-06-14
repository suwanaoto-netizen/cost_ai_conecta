import { describe, it, expect } from "vitest";
import { applyOverride, effDocLine, findOverride } from "./adjustments";
import type { Adjustment, Line } from "./types";

const origLine: Line = Object.freeze({
  lid: 5,
  item: "軽油 給油",
  plate: "名古屋100あ1234",
  kind: "単車",
  cat: "燃料費",
  inspectedAt: "2026-04-30",
  amount: 50000,
  confidence: 0.96,
}) as Line;

const meta = (newId: string) => ({ ts: "2026-06-14 02:00:00", user: "諏訪 尚杜", newId });

describe("連携済み明細の不変化と override 調整", () => {
  it("凍結された元明細は変更されない", () => {
    expect(() => {
      "use strict";
      (origLine as { amount: number }).amount = 999;
    }).toThrow();
    expect(origLine.amount).toBe(50000);
  });

  it("override で実効値が変わり、元明細は不変", () => {
    const adjs = applyOverride([], origLine, "d1", "amount", 62000, meta("adj1"));
    expect(adjs).toHaveLength(1);
    expect(effDocLine(origLine, "d1", adjs).amount).toBe(62000);
    expect(origLine.amount).toBe(50000);
  });

  it("複数フィールドが単一調整に集約される", () => {
    let adjs: Adjustment[] = [];
    adjs = applyOverride(adjs, origLine, "d1", "amount", 62000, meta("adj1"));
    adjs = applyOverride(adjs, origLine, "d1", "cat", "修繕・維持費", meta("adj1"));
    expect(adjs).toHaveLength(1);
    expect(Object.keys(findOverride(adjs, "d1", 5)!.patch).sort()).toEqual(["amount", "cat"]);
    const eff = effDocLine(origLine, "d1", adjs);
    expect(eff.cat).toBe("修繕・維持費");
    expect(eff.amount).toBe(62000);
  });

  it("フィールドを原値へ戻すと patch から消える（部分undo）", () => {
    let adjs: Adjustment[] = [];
    adjs = applyOverride(adjs, origLine, "d1", "amount", 62000, meta("adj1"));
    adjs = applyOverride(adjs, origLine, "d1", "cat", "修繕・維持費", meta("adj1"));
    adjs = applyOverride(adjs, origLine, "d1", "amount", 50000, meta("adj1"));
    const ov = findOverride(adjs, "d1", 5)!;
    expect(ov.patch.amount).toBeUndefined();
    expect(ov.patch.cat).toBe("修繕・維持費");
  });

  it("全フィールド原状回復で調整自体が消える（完全undo）", () => {
    let adjs: Adjustment[] = [];
    adjs = applyOverride(adjs, origLine, "d1", "amount", 62000, meta("adj1"));
    adjs = applyOverride(adjs, origLine, "d1", "cat", "修繕・維持費", meta("adj1"));
    adjs = applyOverride(adjs, origLine, "d1", "amount", 50000, meta("adj1"));
    adjs = applyOverride(adjs, origLine, "d1", "cat", "燃料費", meta("adj1"));
    expect(adjs).toHaveLength(0);
    const eff = effDocLine(origLine, "d1", adjs);
    expect(eff.amount).toBe(50000);
    expect(eff.cat).toBe("燃料費");
  });
});
