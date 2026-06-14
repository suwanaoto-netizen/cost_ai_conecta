import type { Line, MatchState, VehicleMaster } from "./types";

/**
 * 車番の正規化：全角英数 → 半角、空白除去。
 * 突合・登録判定は必ずこの正規化キーで行う（OCRの全角/半角・空白ゆらぎを吸収）。
 */
export function normPlate(raw: string | null | undefined): string {
  return String(raw ?? "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, "")
    .trim();
}

/** 正規化済み車番 → 車両ID のインデックス。車両マスタから導出する。 */
export type PlateIndex = Map<string, string>;

export function buildPlateIndex(masters: VehicleMaster[]): PlateIndex {
  const idx: PlateIndex = new Map();
  for (const v of masters) {
    if (v.plate && v.id) idx.set(normPlate(v.plate), v.id);
  }
  return idx;
}

export function plateRegistered(idx: PlateIndex, plate: string): boolean {
  return idx.has(normPlate(plate));
}

export function resolveVehicleId(idx: PlateIndex, plate: string): string | null {
  return idx.get(normPlate(plate)) ?? null;
}

/**
 * 明細の突合状態を判定する。
 * 信頼度がしきい値未満なら、既存車番に一致していても要確認に倒す（誤紐付け防止）。
 */
export function matchOf(
  line: Pick<Line, "plate" | "confidence">,
  idx: PlateIndex,
  threshold: number,
): MatchState {
  const key = normPlate(line.plate);
  if (!key) return "missing";
  const hit = idx.has(key);
  if (+line.confidence < threshold) return hit ? "existing-suspect" : "suspect";
  return hit ? "existing" : "new";
}

/** 連携前の要確認件数（suspect / existing-suspect）。 */
export function countUnresolved(
  lines: Array<Pick<Line, "plate" | "confidence">>,
  idx: PlateIndex,
  threshold: number,
): number {
  return lines.filter((l) => {
    const s = matchOf(l, idx, threshold);
    return s === "suspect" || s === "existing-suspect";
  }).length;
}
