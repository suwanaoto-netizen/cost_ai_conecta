import { describe, it, expect } from "vitest";
import { buildVehicles } from "./vehicles";
import { buildPlateIndex } from "./match";
import { applyOverride } from "./adjustments";
import type { Adjustment, Document, Line, VehicleMaster } from "./types";

const master = (id: string, plate: string): VehicleMaster => ({
  no: 1, id, plate, chassis: "", code: "", name: "", note: "", office: "",
  maxLoad: "", grossWeight: "", size: "", klass: "",
});

const line = (lid: number, docId: string, plate: string, amount: number, extra: Partial<Line> = {}): Line => ({
  lid, item: "軽油 給油", plate, kind: "単車", cat: "燃料費",
  inspectedAt: "2026-04-30", amount, confidence: 0.96, docId, ...extra,
});

const reflectedDoc = (id: string): Document => ({
  id, no: 1, name: `inv_${id}.pdf`, vendor: "ENEOS", cat: "請求書",
  status: "連携済み", category: "名古屋", reflectedAt: "2026-04-30 09:00:00", deleted: false,
});

const masters = [master("veh_0001", "名古屋100あ1234")];
const idx = buildPlateIndex(masters);

describe("buildVehicles", () => {
  it("OCRゆらぎの明細を同一車両IDに集約し、表示はマスタの正規plate", () => {
    const docs = [reflectedDoc("d1")];
    const lines = [
      line(1, "d1", "名古屋100あ1234", 30000),
      line(2, "d1", "名古屋 １００ あ１２３４", 20000),
    ];
    const vs = buildVehicles({ docs, lines, manualLines: [], adjustments: [], masters, plateIndex: idx });
    expect(vs).toHaveLength(1);
    expect(vs[0].key).toBe("veh_0001");
    expect(vs[0].target).toBe("名古屋100あ1234");
    expect(vs[0].total).toBe(50000);
  });

  it("未登録車番は U: プレフィックスで暫定集計", () => {
    const docs = [reflectedDoc("d1")];
    const lines = [line(1, "d1", "岐阜500か9999", 12000)];
    const vs = buildVehicles({ docs, lines, manualLines: [], adjustments: [], masters, plateIndex: idx });
    expect(vs[0].key).toBe("U:岐阜500か9999");
  });

  it("override 調整が集計の実効値に反映され、元明細は不変", () => {
    const docs = [reflectedDoc("d1")];
    const orig = line(1, "d1", "名古屋100あ1234", 50000);
    const lines = [orig];
    let adjs: Adjustment[] = [];
    adjs = applyOverride(adjs, orig, "d1", "amount", 62000, { ts: "t", user: "u", newId: "adj1" });
    const vs = buildVehicles({ docs, lines, manualLines: [], adjustments: adjs, masters, plateIndex: idx });
    expect(vs[0].total).toBe(62000);
    expect(orig.amount).toBe(50000); // 元データ不変
  });

  it("連携済みでない書類は集計対象外", () => {
    const docs = [{ ...reflectedDoc("d1"), status: "入力済み" as const }];
    const lines = [line(1, "d1", "名古屋100あ1234", 50000)];
    const vs = buildVehicles({ docs, lines, manualLines: [], adjustments: [], masters, plateIndex: idx });
    expect(vs).toHaveLength(0);
  });

  it("期間フィルタは override 後の実効発生日で判定", () => {
    const docs = [reflectedDoc("d1")];
    const orig = line(1, "d1", "名古屋100あ1234", 50000, { inspectedAt: "2026-04-30" });
    let adjs: Adjustment[] = [];
    adjs = applyOverride(adjs, orig, "d1", "inspectedAt", "2026-06-15", { ts: "t", user: "u", newId: "adj1" });
    const range = { start: "2026-06-01", end: "2026-06-30" };
    const vs = buildVehicles({ docs, lines: [orig], manualLines: [], adjustments: adjs, masters, plateIndex: idx, range });
    expect(vs).toHaveLength(1);
    expect(vs[0].total).toBe(50000);
  });
});
