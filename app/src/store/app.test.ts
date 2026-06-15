import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./app";
import { freezeLine } from "../domain/freeze";
import { asLid } from "../domain/ids";
import type { Document, Line, ManualLine, VehicleMaster } from "../domain/types";

const master = (no: number, id: string, plate: string): VehicleMaster => ({
  no, id, plate, chassis: "", code: "", name: "", note: "", office: "",
  maxLoad: null, grossWeight: null, size: "", klass: "",
});
const reflectedDoc = (id: string): Document => ({
  id, no: 1, name: `inv_${id}.pdf`, vendor: "v", cat: "請求書",
  status: "連携済み", category: "", reflectedAt: "2026-04-30 09:00:00", deleted: false,
});
const line = (lid: string, docId: string, vehicleId: string): Line => ({
  lid: asLid(lid), item: "x", plate: "名古屋100あ1234", kind: "単車", cat: "燃料費",
  inspectedAt: "2026-04-30", amount: 1000, confidence: 0.97, docId, vehicleId,
});
const manual = (id: string, vkey: string): ManualLine => ({
  id, vkey, kind: "単車", target: "t", item: "手動", cat: "燃料費",
  date: "2026-04-30", amount: 500, vendor: "", office: "",
});

// FK：連携済み明細が紐づく veh_R は削除拒否、手動明細だけの veh_M はカスケード削除。
beforeEach(() => {
  useAppStore.setState({
    documents: { d1: reflectedDoc("d1") },
    docOrder: ["d1"],
    linesById: { L1: freezeLine(line("L1", "d1", "veh_R")) },
    lineIdsByDoc: { d1: ["L1"] },
    manualLinesById: { m1: manual("m1", "veh_M") },
    adjustmentsById: {},
    vehiclesById: { veh_R: master(10, "veh_R", "名古屋100あ1234"), veh_M: master(20, "veh_M", "岐阜500か0001") },
    vehicleOrder: ["veh_R", "veh_M"],
    changelog: [],
    vehTrash: {},
    changelogSeenCount: 0,
  });
});

describe("ストア層の FK 整合（車両削除）", () => {
  it("連携済み明細が紐づく車両は削除を拒否する（no-op）", () => {
    const res = useAppStore.getState().remove(10);
    expect(res.ok).toBe(false);
    expect(res.blockedByReflected).toBe(1);
    // 車両は残る
    expect(useAppStore.getState().vehiclesById.veh_R).toBeTruthy();
  });

  it("手動明細だけの車両は削除でき、手動明細をカスケード削除する", () => {
    const res = useAppStore.getState().remove(20);
    expect(res.ok).toBe(true);
    expect(res.removedManual).toBe(1);
    const s = useAppStore.getState();
    expect(s.vehiclesById.veh_M).toBeUndefined();
    expect(s.vehicleOrder).not.toContain("veh_M");
    expect(s.manualLinesById.m1).toBeUndefined();
  });
});
