import { describe, it, expect } from "vitest";
import { docTotal, docDate, ocrAmountCandidates, plateSuggestions, expectedDocTypes } from "./documents";
import { buildReflectPlan } from "./reflect";
import { buildPlateIndex } from "./match";
import type { Line, VehicleMaster } from "./types";

const line = (lid: number, plate: string, amount: number, conf = 0.97, cat = "燃料費"): Line => ({
  lid, item: "軽油", plate, kind: "単車", cat, inspectedAt: "2026-04-30", amount, confidence: conf,
});

describe("documents helpers", () => {
  const ls = [line(1, "", 30000), line(2, "", 20000)];
  it("docTotal / docDate", () => {
    expect(docTotal(ls)).toBe(50000);
    expect(docDate([line(1, "", 1, 0.9), { ...line(2, "", 1), inspectedAt: "2026-01-01" }])).toBe("2026-01-01");
  });
  it("ocrAmountCandidates は明細額・合計・税・税込を降順で返す", () => {
    const c = ocrAmountCandidates(ls); // 30000,20000,total50000,tax5000,55000
    expect(c).toEqual([55000, 50000, 30000, 20000, 5000]);
  });
  it("plateSuggestions は2文字以上一致を返す", () => {
    const plates = ["名古屋100あ1234", "三河800さ9012"];
    expect(plateSuggestions("名古屋100", plates)).toContain("名古屋100あ1234");
    expect(plateSuggestions("x", plates)).toEqual([]);
  });
  it("expectedDocTypes は分類から想定タイプを集約", () => {
    const out = expectedDocTypes([line(1, "", 1, 0.9, "保険料")], { 保険料: ["保険証券", "請求書"] });
    expect(out).toEqual(["保険証券", "請求書"]);
  });
});

describe("buildReflectPlan", () => {
  const master = (id: string, plate: string): VehicleMaster => ({
    no: 1, id, plate, chassis: "", code: "", name: "", note: "", office: "", maxLoad: "", grossWeight: "", size: "", klass: "",
  });
  const idx = buildPlateIndex([master("veh_1", "名古屋100あ1234")]);

  it("new は新規マスタ作成、existing は追記、suspect はスキップ", () => {
    const plan = buildReflectPlan(
      [
        line(1, "名古屋100あ1234", 1000), // existing
        line(2, "岐阜500か9999", 1000), // new (high conf, unregistered)
        line(3, "岐阜500か9999", 1000, 0.5), // suspect (low conf, unregistered)
      ],
      idx,
      0.85,
    );
    expect(plan.some((s) => s.phase === 1)).toBe(true); // 新規マスタ
    expect(plan.some((s) => s.text.startsWith("SKIP"))).toBe(true); // suspect skip
    expect(plan.some((s) => s.ok.includes("既存マスタに追記"))).toBe(true);
  });
});
