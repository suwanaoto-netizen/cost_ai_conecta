import { describe, it, expect } from "vitest";
import { genChassis, lookupJikenkyo, officeFromPlate, fmtKg } from "./jikenkyo";
import { seedVehicleMasters } from "./masterSeed";
import { buildPlateIndex, resolveVehicleId } from "./match";

describe("jikenkyo lookup", () => {
  it("型式コードから車格・諸元を引く", () => {
    const spec = lookupJikenkyo("2KG-FK71F-590481"); // FK → 中型
    expect(spec?.klass).toBe("中型");
    expect(spec?.gross).toBe(7985);
    expect(spec?.maxLoad).toBeGreaterThanOrEqual(3800);
  });
  it("該当なしは null", () => {
    expect(lookupJikenkyo("")).toBeNull();
    expect(lookupJikenkyo("X")).toBeNull();
  });
  it("生成した車台番号は必ず突合できる（表示と突合の一致）", () => {
    const spec = lookupJikenkyo(genChassis("名古屋100あ1234"));
    expect(spec).not.toBeNull();
  });
  it("officeFromPlate は地名から営業所を推定", () => {
    expect(officeFromPlate("名古屋100あ1234", ["名古屋営業所", "岡崎営業所"])).toBe("名古屋営業所");
    expect(officeFromPlate("浜松100か3030", ["名古屋営業所"])).toBe("");
  });
  it("fmtKg", () => {
    expect(fmtKg(13600)).toBe("13,600 kg");
    expect(fmtKg("")).toBe("");
  });
});

describe("seedVehicleMasters", () => {
  const vs = seedVehicleMasters();
  it("一意な車両IDと車番を持つ", () => {
    const ids = new Set(vs.map((v) => v.id));
    const plates = new Set(vs.map((v) => v.plate));
    expect(ids.size).toBe(vs.length);
    expect(plates.size).toBe(vs.length);
    expect(vs.length).toBeGreaterThan(0);
  });
  it("plate index 経由で車番→車両IDに解決できる", () => {
    const idx = buildPlateIndex(vs);
    const first = vs[0];
    expect(resolveVehicleId(idx, first.plate)).toBe(first.id);
  });
});
