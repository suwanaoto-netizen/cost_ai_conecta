import { describe, it, expect } from "vitest";
import { vehicleMetrics } from "./vehicleMetrics";
import type { Vehicle, VehLine } from "./vehicles";

const line = (cat: string, item: string, amount: number): VehLine => ({
  lid: Math.random().toString(36).slice(2),
  src: "doc",
  item,
  cat,
  date: "2026-05-01",
  amount,
  vendor: "v",
  doc: "d",
  office: "",
});

function vehicleOf(lines: VehLine[]): Vehicle {
  const byCat: Record<string, number> = {};
  let total = 0;
  for (const l of lines) {
    byCat[l.cat] = (byCat[l.cat] || 0) + l.amount;
    total += l.amount;
  }
  return { key: "k", kind: "単車", target: "名古屋100あ1234", total, byCat, count: lines.length, last: "2026-05-01", lines, fuso: null };
}

const flat = (v: Vehicle) => {
  const m = new Map<string, { value: number; na?: boolean }>();
  for (const g of vehicleMetrics(v)) for (const x of g.metrics) m.set(`${g.cat}:${x.label}`, { value: x.value, na: x.na });
  return m;
};

describe("vehicleMetrics", () => {
  it("通算は親コスト分類の合計（byCat）に一致する", () => {
    const v = vehicleOf([line("燃料費", "軽油 給油（5月分）", 50000), line("通行料", "ETC利用料（5月分）", 28400)]);
    const m = flat(v);
    expect(m.get("燃料費:通算")!.value).toBe(50000);
    expect(m.get("通行料:通算")!.value).toBe(28400);
    expect(m.get("通行料:高速道路通行料（ETC）金額（円）")!.value).toBe(28400);
  });

  it("修繕・維持費は内訳コードごとに集計する", () => {
    const v = vehicleOf([
      line("修繕・維持費", "継続車検 / 24ヶ月点検", 98500),
      line("修繕・維持費", "12ヶ月点検", 42000),
      line("修繕・維持費", "フロントバンパー交換", 45000),
      line("修繕・維持費", "タイヤ4本交換（一括）", 248000),
    ]);
    const m = flat(v);
    expect(m.get("修繕・維持費:通算")!.value).toBe(98500 + 42000 + 45000 + 248000);
    expect(m.get("修繕・維持費:定期点検請求書 合計金額（円）")!.value).toBe(98500 + 42000);
    expect(m.get("修繕・維持費:修理 合計金額")!.value).toBe(45000);
    expect(m.get("修繕・維持費:タイヤ交換金額（円）")!.value).toBe(248000);
  });

  it("税金は品名（自動車税／重量税）で振り分ける", () => {
    const v = vehicleOf([line("税金", "自動車税", 41500), line("税金", "重量税（車検時）", 32800)]);
    const m = flat(v);
    expect(m.get("税金:自動車税 費用（円）")!.value).toBe(41500);
    expect(m.get("税金:重量税 費用（円）")!.value).toBe(32800);
  });

  it("保険料は自賠責／任意で振り分ける", () => {
    const v = vehicleOf([line("保険料", "自賠責保険料", 9200), line("保険料", "任意保険料（自動車保険）", 18600)]);
    const m = flat(v);
    expect(m.get("保険料:自賠責保険 保険費用（円）")!.value).toBe(9200);
    expect(m.get("保険料:任意保険 保険費用（円）")!.value).toBe(18600);
  });

  it("データ未保有の内訳（部品代／技術代／リース総額）は na=true", () => {
    const v = vehicleOf([line("調達コスト", "車両リース料（月次）", 88000)]);
    const m = flat(v);
    expect(m.get("調達コスト:リース 月間リース料金（円）")!.value).toBe(88000);
    expect(m.get("調達コスト:リース 総額（円）")!.na).toBe(true);
    expect(m.get("修繕・維持費:定期点検請求書 部品代（円）")!.na).toBe(true);
    expect(m.get("修繕・維持費:修理 技術代（円）")!.na).toBe(true);
  });
});
