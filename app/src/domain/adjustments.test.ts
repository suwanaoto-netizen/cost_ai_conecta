import { describe, it, expect } from "vitest";
import { applyOverride, effDocLine, findOverride, pruneAdjustments } from "./adjustments";
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

describe("pruneAdjustments（孤児調整の GC）", () => {
  const adj = (docId: string, lid: string): Adjustment => ({
    id: "adj_" + docId + "_" + lid, docId, lid, type: "override",
    patch: { amount: 1 }, ts: "t", user: "u",
  });

  it("現存しない lid の調整を取り除く（lid は number でも一致判定）", () => {
    const adjs = [adj("d1", "5"), adj("d1", "9"), adj("d1", "12")];
    const kept = pruneAdjustments(adjs, "d1", [5, 12]); // number で渡しても OK
    expect(kept.map((a) => a.lid).sort()).toEqual(["12", "5"]);
  });

  it("他書類の調整は keepLids に無くても保持する", () => {
    const adjs = [adj("d1", "5"), adj("d2", "5"), adj("d2", "7")];
    const kept = pruneAdjustments(adjs, "d1", []); // d1 の明細は全て消えた
    expect(kept.map((a) => a.docId + ":" + a.lid).sort()).toEqual(["d2:5", "d2:7"]);
  });

  it("全 lid が現存すれば変化しない", () => {
    const adjs = [adj("d1", "5"), adj("d1", "9")];
    expect(pruneAdjustments(adjs, "d1", [5, 9, 99])).toHaveLength(2);
  });
});
