import { describe, it, expect } from "vitest";
import { seedDocuments } from "./docSeed";
import { seedVehicleMasters } from "./masterSeed";
import { buildPlateIndex } from "./match";
import { buildVehicles } from "./vehicles";

describe("seedDocuments", () => {
  const { docs, lines } = seedDocuments();

  it("書類と明細を生成し、連携済みが含まれる", () => {
    expect(docs.length).toBeGreaterThan(0);
    expect(lines.length).toBeGreaterThan(0);
    expect(docs.some((d) => d.status === "連携済み")).toBe(true);
  });

  it("連携済み書類の明細は凍結されている（真の不変化）", () => {
    const reflectedId = docs.find((d) => d.status === "連携済み")!.id;
    const l = lines.find((x) => x.docId === reflectedId)!;
    expect(Object.isFrozen(l)).toBe(true);
  });

  it("連携済みデータで buildVehicles が車両を集計できる", () => {
    const masters = seedVehicleMasters();
    const vehicles = buildVehicles({
      docs, lines, manualLines: [], adjustments: [], masters, plateIndex: buildPlateIndex(masters),
    });
    expect(vehicles.length).toBeGreaterThan(0);
    expect(vehicles.every((v) => v.total > 0)).toBe(true);
    // 既存車番はマスタの正規plate（= 車両ID集計）でキーされる
    expect(vehicles.some((v) => v.key.startsWith("veh_"))).toBe(true);
  });

  it("curated SEED（明示書類）が含まれ、OCR誤読デモ明細を持つ", () => {
    const seedDoc = docs.find((d) => d.name === "板金塗装_中日本ボデー_202605.pdf");
    expect(seedDoc).toBeTruthy();
    // 既知の誤読（三河800さ901O / 信頼度0.73）が明細として存在する
    const misread = lines.find((l) => l.plate === "三河800さ901O");
    expect(misread).toBeTruthy();
    expect(misread!.confidence).toBeCloseTo(0.73);
  });
});
