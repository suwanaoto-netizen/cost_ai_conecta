import { describe, it, expect } from "vitest";
import { DEFAULT_COST_CATS, DEFAULT_CAT_NAMES, subcatsOf, catDocTypesRecord } from "./costCats";

describe("costCats master", () => {
  it("既定マスタは全分類を想定書類タイプ付きで持つ", () => {
    expect(DEFAULT_COST_CATS.map((c) => c.name)).toEqual(DEFAULT_CAT_NAMES);
    DEFAULT_COST_CATS.forEach((c) => expect(c.docTypes.length).toBeGreaterThan(0));
  });

  it("内訳を持つ分類のみ subcatsOf が値を返す", () => {
    expect(subcatsOf("燃料費").some((s) => s.code === "diesel")).toBe(true);
    expect(subcatsOf("修繕・維持費").some((s) => s.code === "tire")).toBe(true);
    expect(subcatsOf("税金")).toEqual([]);
  });

  it("catDocTypesRecord は expectedDocTypes に渡せる Record を返す", () => {
    const rec = catDocTypesRecord(DEFAULT_COST_CATS);
    expect(rec["保険料"]).toContain("保険証券");
    expect(Object.keys(rec)).toEqual(DEFAULT_CAT_NAMES);
  });
});
