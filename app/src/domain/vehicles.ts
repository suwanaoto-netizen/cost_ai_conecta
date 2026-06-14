import type { Adjustment, Document, Line, ManualLine, VehicleMaster } from "./types";
import { effDocLine } from "./adjustments";
import { normPlate, resolveVehicleId, type PlateIndex } from "./match";

export interface VehLine {
  lid: string | number;
  src: "doc" | "manual";
  docId?: string;
  item: string;
  cat: string;
  date: string;
  amount: number;
  vendor: string;
  doc: string;
  office: string;
  fuso?: Line["fuso"];
}

export interface Vehicle {
  key: string; // 車両ID または "U:正規化plate" / "未設定"
  kind: string;
  target: string; // 表示車番（マスタの正規plate）
  total: number;
  byCat: Record<string, number>;
  count: number;
  last: string;
  lines: VehLine[];
  fuso: Line["fuso"] | null;
}

export interface BuildVehiclesInput {
  docs: Document[];
  lines: Line[];
  manualLines: ManualLine[];
  adjustments: Adjustment[];
  masters: VehicleMaster[];
  plateIndex: PlateIndex;
  catFilter?: string;
  range?: { start: string; end: string } | null;
}

/**
 * コストモニターの集計。連携済み書類の明細（override 調整適用済みの実効値）と手動明細を、
 * 不変の車両ID をキーに積み上げる。表示車番はマスタの正規 plate（OCRゆらぎ吸収）、
 * 未登録は "U:正規化plate" で暫定集計する。
 */
export function buildVehicles(input: BuildVehiclesInput): Vehicle[] {
  const {
    docs,
    lines,
    manualLines,
    adjustments,
    masters,
    plateIndex,
    catFilter = "all",
    range = null,
  } = input;

  const inR =
    range && range.start && range.end
      ? (dt: string) => !!dt && dt >= range.start && dt <= range.end
      : () => true;

  const masterById = new Map(masters.map((m) => [m.id, m]));
  const linesByDoc = new Map<string, Line[]>();
  for (const l of lines) {
    if (!l.docId) continue;
    const arr = linesByDoc.get(l.docId) ?? [];
    arr.push(l);
    linesByDoc.set(l.docId, arr);
  }

  const map = new Map<string, Vehicle>();
  const ensure = (key: string, kind: string, target: string): Vehicle => {
    let v = map.get(key);
    if (!v) {
      v = { key, kind, target, total: 0, byCat: {}, count: 0, last: "", lines: [], fuso: null };
      map.set(key, v);
    }
    return v;
  };
  const add = (v: Vehicle, line: VehLine) => {
    v.total += +line.amount || 0;
    v.byCat[line.cat] = (v.byCat[line.cat] || 0) + (+line.amount || 0);
    v.count++;
    if (line.date > v.last) v.last = line.date;
    v.lines.push(line);
    if (line.fuso && !v.fuso) v.fuso = line.fuso;
  };

  for (const d of docs) {
    if (d.status !== "連携済み" || d.deleted) continue;
    if (catFilter !== "all" && (d.category || "") !== catFilter) continue;
    for (const l of linesByDoc.get(d.id) ?? []) {
      const eff = effDocLine(l, d.id, adjustments); // 凍結された元明細 ＋ override ＝ 実効値
      if (!inR(eff.inspectedAt)) continue;
      const vid = l.vehicleId || resolveVehicleId(plateIndex, l.plate);
      const mv = vid ? masterById.get(vid) ?? null : null;
      const target = mv ? mv.plate : l.plate || "未設定";
      const key = vid || (normPlate(l.plate) ? "U:" + normPlate(l.plate) : "未設定");
      add(ensure(key, "単車", target), {
        lid: l.lid,
        src: "doc",
        docId: d.id,
        item: eff.item,
        cat: eff.cat,
        date: eff.inspectedAt,
        amount: +eff.amount,
        vendor: d.vendor,
        doc: d.name,
        office: d.category,
        fuso: l.fuso,
      });
    }
  }

  for (const m of manualLines) {
    if (catFilter !== "all" && (m.office || "") !== catFilter) continue;
    if (!inR(m.date)) continue;
    add(ensure(m.vkey, m.kind, m.target), {
      lid: m.id,
      src: "manual",
      item: m.item,
      cat: m.cat,
      date: m.date,
      amount: +m.amount,
      vendor: m.vendor || "手動追加",
      doc: "手動追加",
      office: m.office || "",
    });
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}
