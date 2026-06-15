import { describe, it, expect } from "vitest";
import { asLid, mintLid } from "./ids";

describe("ids", () => {
  it("mintLid は生成元をまたいでも一意（採番一元化）", () => {
    const ids = Array.from({ length: 1000 }, () => mintLid());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("asLid は数値・文字列を同一の Lid 文字列へ正規化する", () => {
    expect(asLid(5)).toBe("5");
    expect(asLid("5")).toBe(asLid(5));
  });
});
