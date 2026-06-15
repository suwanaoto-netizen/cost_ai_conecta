import { describe, it, expect } from "vitest";
import { encodeVehKey, parseVehKey, vehKeyOf, UNSET_KEY, type VehKey } from "./vehKey";

describe("vehKey", () => {
  const cases: { k: VehKey; s: string }[] = [
    { k: { kind: "master", id: "veh_0001" }, s: "veh_0001" },
    { k: { kind: "unregistered", plate: "岐阜500か9999" }, s: "U:岐阜500か9999" },
    { k: { kind: "unset" }, s: UNSET_KEY },
  ];

  it("encode と parse は相互逆変換になる（round-trip）", () => {
    for (const { k, s } of cases) {
      expect(encodeVehKey(k)).toBe(s);
      expect(parseVehKey(s)).toEqual(k);
    }
  });

  it("vehKeyOf：車両IDがあれば master、無ければ正規化車番で unregistered／空は unset", () => {
    expect(vehKeyOf("veh_0001", "名古屋100あ1234")).toEqual({ kind: "master", id: "veh_0001" });
    // 全角・空白ゆらぎは正規化される
    expect(vehKeyOf(null, "岐阜 ５００ か９９９９")).toEqual({ kind: "unregistered", plate: "岐阜500か9999" });
    expect(vehKeyOf(null, "")).toEqual({ kind: "unset" });
  });
});
