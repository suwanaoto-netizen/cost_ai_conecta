import { describe, it, expect } from "vitest";
import {
  REPAIR_CAT,
  FUEL_CAT,
  INSURANCE_CAT,
  REPAIR_SUBCATS,
  FUEL_SUBCATS,
  SUBCATS_BY_CAT,
  inferSubcat,
  resolveSubcat,
  subcatLabel,
  hasSubcat,
  // 後方互換エイリアス
  inferRepairSubcat,
  repairSubcatLabel,
  resolveRepairSubcat,
} from "./repairSubcat";
import { seedDocuments } from "./docSeed";

describe("subcat（修繕・維持費）", () => {
  it("品名から内訳コードを推定する", () => {
    expect(inferSubcat(REPAIR_CAT, "継続車検 / 24ヶ月点検")).toBe("shaken");
    expect(inferSubcat(REPAIR_CAT, "12ヶ月点検")).toBe("inspection");
    expect(inferSubcat(REPAIR_CAT, "バッテリー交換")).toBe("battery");
    expect(inferSubcat(REPAIR_CAT, "タイヤ4本交換")).toBe("tire");
    expect(inferSubcat(REPAIR_CAT, "スタッドレス組替")).toBe("tire");
    expect(inferSubcat(REPAIR_CAT, "オイル・エレメント交換")).toBe("oil");
    expect(inferSubcat(REPAIR_CAT, "左サイドパネル 板金塗装")).toBe("repair");
    expect(inferSubcat(REPAIR_CAT, "ワイパー・電球交換")).toBe("onboard");
  });

  it("未該当はドライバー利用消耗品にフォールバックする", () => {
    expect(inferSubcat(REPAIR_CAT, "謎の品目")).toBe("consumable");
  });
});

describe("subcat（燃料費）", () => {
  it("品名から燃料の内訳コードを推定する", () => {
    expect(inferSubcat(FUEL_CAT, "軽油 給油（月次）")).toBe("diesel");
    expect(inferSubcat(FUEL_CAT, "ガソリン 給油（月次）")).toBe("gasoline");
    expect(inferSubcat(FUEL_CAT, "アドブルー補充")).toBe("adblue");
    expect(inferSubcat(FUEL_CAT, "尿素水 補充")).toBe("adblue");
    expect(inferSubcat(FUEL_CAT, "燃料添加剤")).toBe("additive");
  });

  it("未該当は軽油にフォールバックする", () => {
    expect(inferSubcat(FUEL_CAT, "給油")).toBe("diesel");
  });
});

describe("subcat（保険料）", () => {
  it("「自賠責」「自動車損害賠償責任保険」は自賠責保険に判定する", () => {
    expect(inferSubcat(INSURANCE_CAT, "自賠責保険料")).toBe("jibaiseki");
    expect(inferSubcat(INSURANCE_CAT, "自動車損害賠償責任保険")).toBe("jibaiseki");
  });

  it("それ以外の保険関連は任意保険にフォールバックする", () => {
    expect(inferSubcat(INSURANCE_CAT, "任意保険料（自動車保険）")).toBe("voluntary");
    expect(inferSubcat(INSURANCE_CAT, "対物・対人賠償保険")).toBe("voluntary");
    expect(resolveSubcat(INSURANCE_CAT, "任意保険料（自動車保険）")).toBe("voluntary");
  });

  it("内訳ラベルに変換できる", () => {
    expect(subcatLabel("jibaiseki")).toBe("自賠責保険");
    expect(subcatLabel("voluntary")).toBe("任意保険");
  });
});

describe("subcat 共通", () => {
  it("内訳を持つ分類だけ resolveSubcat が値を返す", () => {
    expect(resolveSubcat(REPAIR_CAT, "タイヤ4本交換")).toBe("tire");
    expect(resolveSubcat(FUEL_CAT, "軽油 給油（月次）")).toBe("diesel");
    expect(resolveSubcat("通行料", "ETC利用料")).toBeUndefined();
    expect(hasSubcat("税金")).toBe(false);
  });

  it("内訳コードはラベルに変換でき、全コードが一意", () => {
    expect(subcatLabel("tire")).toBe("タイヤ");
    expect(subcatLabel("diesel")).toBe("軽油");
    expect(subcatLabel("")).toBe("");
    const codes = Object.values(SUBCATS_BY_CAT).flatMap((arr) => arr.map((s) => s.code));
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("後方互換エイリアスが従来通り動作する", () => {
    expect(inferRepairSubcat("タイヤ4本交換")).toBe("tire");
    expect(repairSubcatLabel("oil")).toBe("オイル");
    expect(resolveRepairSubcat(REPAIR_CAT, "12ヶ月点検")).toBe("inspection");
    expect(REPAIR_SUBCATS.length).toBe(9);
    expect(FUEL_SUBCATS.length).toBe(4);
  });

  it("シードの修繕・維持費／燃料費の明細には内訳コードが付与される", () => {
    const { lines } = seedDocuments();
    const withSub = lines.filter((l) => l.cat === REPAIR_CAT || l.cat === FUEL_CAT);
    expect(withSub.length).toBeGreaterThan(0);
    expect(withSub.every((l) => !!l.subCat)).toBe(true);
    // 内訳を持たない分類には付かない
    expect(lines.filter((l) => !hasSubcat(l.cat)).every((l) => !l.subCat)).toBe(true);
  });
});
