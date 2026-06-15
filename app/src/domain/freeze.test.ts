import { describe, it, expect } from "vitest";
import { freezeLine, isLineFrozen } from "./freeze";
import { asLid } from "./ids";
import type { Line } from "./types";

const mk = (): Line => ({
  lid: asLid(1), item: "軽油 給油", plate: "名古屋100あ1234", kind: "単車",
  cat: "燃料費", inspectedAt: "2026-04-30", amount: 50000, confidence: 0.96, docId: "d1",
});

describe("freezeLine / isLineFrozen", () => {
  it("凍結後は in-place 変更が実行時にも拒否される（連携済みは不変）", () => {
    const f = freezeLine(mk());
    expect(isLineFrozen(f)).toBe(true);
    expect(() => {
      "use strict";
      (f as { amount: number }).amount = 999;
    }).toThrow();
    expect(f.amount).toBe(50000);
  });

  it("未凍結の明細は isLineFrozen が false", () => {
    expect(isLineFrozen(mk())).toBe(false);
  });
});
