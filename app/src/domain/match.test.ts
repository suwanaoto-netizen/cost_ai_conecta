import { describe, it, expect } from "vitest";
import {
  normPlate,
  buildPlateIndex,
  plateRegistered,
  resolveVehicleId,
  matchOf,
  countUnresolved,
} from "./match";
import type { VehicleMaster } from "./types";

const master = (id: string, plate: string): VehicleMaster => ({
  no: 1,
  id,
  plate,
  chassis: "",
  code: "",
  name: "",
  note: "",
  office: "",
  maxLoad: "",
  grossWeight: "",
  size: "",
  klass: "",
});

const idx = buildPlateIndex([master("veh_0001", "名古屋100あ1234")]);
const TH = 0.85;

describe("normPlate", () => {
  it("全角英数と空白を正規化する", () => {
    expect(normPlate("名古屋 １００ あ１２３４")).toBe("名古屋100あ1234");
  });
  it("null/undefined を安全に扱う", () => {
    expect(normPlate(null)).toBe("");
    expect(normPlate(undefined)).toBe("");
  });
});

describe("plateRegistered / resolveVehicleId", () => {
  it("ゆらぎを吸収して同一車両IDに解決する", () => {
    expect(plateRegistered(idx, "名古屋 １００ あ１２３４")).toBe(true);
    expect(resolveVehicleId(idx, "名古屋 １００ あ１２３４")).toBe("veh_0001");
  });
  it("未登録は false / null", () => {
    expect(plateRegistered(idx, "岐阜500か9999")).toBe(false);
    expect(resolveVehicleId(idx, "岐阜500か9999")).toBeNull();
  });
});

describe("matchOf 判定マトリクス", () => {
  it("高信頼度 × 既存一致 → existing", () => {
    expect(matchOf({ plate: "名古屋100あ1234", confidence: 0.97 }, idx, TH)).toBe("existing");
  });
  it("低信頼度 × 既存一致 → existing-suspect（誤紐付け防止）", () => {
    expect(matchOf({ plate: "名古屋 １００ あ１２３４", confidence: 0.6 }, idx, TH)).toBe(
      "existing-suspect",
    );
  });
  it("高信頼度 × 未登録 → new", () => {
    expect(matchOf({ plate: "岐阜500か9999", confidence: 0.97 }, idx, TH)).toBe("new");
  });
  it("低信頼度 × 未登録 → suspect", () => {
    expect(matchOf({ plate: "岐阜500か9999", confidence: 0.6 }, idx, TH)).toBe("suspect");
  });
  it("車番空 → missing", () => {
    expect(matchOf({ plate: "", confidence: 0.97 }, idx, TH)).toBe("missing");
  });
});

describe("countUnresolved", () => {
  it("suspect と existing-suspect を数える", () => {
    const lines = [
      { plate: "名古屋100あ1234", confidence: 0.97 }, // existing
      { plate: "名古屋100あ1234", confidence: 0.6 }, // existing-suspect
      { plate: "岐阜500か9999", confidence: 0.6 }, // suspect
      { plate: "岐阜500か9999", confidence: 0.97 }, // new
      { plate: "", confidence: 0.97 }, // missing
    ];
    expect(countUnresolved(lines, idx, TH)).toBe(2);
  });
});
