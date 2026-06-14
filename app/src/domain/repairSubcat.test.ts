import { describe, it, expect } from "vitest";
import {
  REPAIR_CAT,
  REPAIR_SUBCATS,
  inferRepairSubcat,
  repairSubcatLabel,
  resolveRepairSubcat,
} from "./repairSubcat";
import { seedDocuments } from "./docSeed";

describe("repairSubcat", () => {
  it("品名から内訳コードを推定する", () => {
    expect(inferRepairSubcat("継続車検 / 24ヶ月点検")).toBe("shaken");
    expect(inferRepairSubcat("12ヶ月点検")).toBe("inspection");
    expect(inferRepairSubcat("バッテリー交換")).toBe("battery");
    expect(inferRepairSubcat("タイヤ4本交換")).toBe("tire");
    expect(inferRepairSubcat("スタッドレス組替")).toBe("tire");
    expect(inferRepairSubcat("オイル・エレメント交換")).toBe("oil");
    expect(inferRepairSubcat("左サイドパネル 板金塗装")).toBe("repair");
    expect(inferRepairSubcat("ワイパー・電球交換")).toBe("onboard");
  });

  it("未該当はドライバー利用消耗品にフォールバックする", () => {
    expect(inferRepairSubcat("謎の品目")).toBe("consumable");
  });

  it("resolveRepairSubcat は修繕・維持費以外では内訳を持たない", () => {
    expect(resolveRepairSubcat(REPAIR_CAT, "タイヤ4本交換")).toBe("tire");
    expect(resolveRepairSubcat("燃料費", "軽油 給油（月次）")).toBeUndefined();
  });

  it("内訳コードはラベルに変換でき、全コードが一意", () => {
    expect(repairSubcatLabel("tire")).toBe("タイヤ");
    expect(repairSubcatLabel("")).toBe("");
    const codes = REPAIR_SUBCATS.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("シードの修繕・維持費明細には内訳コードが付与される", () => {
    const { lines } = seedDocuments();
    const repair = lines.filter((l) => l.cat === REPAIR_CAT);
    expect(repair.length).toBeGreaterThan(0);
    expect(repair.every((l) => !!l.subCat)).toBe(true);
    // 修繕・維持費以外には内訳が付かない
    expect(lines.filter((l) => l.cat !== REPAIR_CAT).every((l) => !l.subCat)).toBe(true);
  });
});
