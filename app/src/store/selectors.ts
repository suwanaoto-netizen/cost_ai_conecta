import { useMemo } from "react";
import { useDataStore } from "./data";
import { useMasterStore } from "./master";
import { buildPlateIndex, type PlateIndex } from "../domain/match";
import { buildVehicles, type Vehicle } from "../domain/vehicles";

/**
 * 分散したストア（data / master）を横断する派生データの単一の入口。
 * 各画面で buildPlateIndex / buildVehicles を手配線していた重複を一元化する。
 */

/** 車両マスタから導出した車番→車両ID インデックス（メモ化）。 */
export function usePlateIndex(): PlateIndex {
  const masters = useMasterStore((s) => s.vehicles);
  return useMemo(() => buildPlateIndex(masters), [masters]);
}

/**
 * コストモニターの車両集計（メモ化）。data ストアの明細・調整・手動明細と
 * master ストアの車両を結合して導出する。
 */
export function useVehicles(
  catFilter: string = "all",
  range: { start: string; end: string } | null = null,
): Vehicle[] {
  const docs = useDataStore((s) => s.docs);
  const lines = useDataStore((s) => s.lines);
  const manualLines = useDataStore((s) => s.manualLines);
  const adjustments = useDataStore((s) => s.adjustments);
  const masters = useMasterStore((s) => s.vehicles);
  const plateIndex = usePlateIndex();
  const start = range?.start ?? null;
  const end = range?.end ?? null;
  return useMemo(
    () =>
      buildVehicles({
        docs, lines, manualLines, adjustments, masters, plateIndex,
        catFilter,
        range: start && end ? { start, end } : null,
      }),
    [docs, lines, manualLines, adjustments, masters, plateIndex, catFilter, start, end],
  );
}
