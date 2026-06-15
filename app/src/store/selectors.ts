import { useMemo } from "react";
import { useAppStore } from "./app";
import { buildPlateIndex, type PlateIndex } from "../domain/match";
import { buildVehicles, type Vehicle } from "../domain/vehicles";
import type { Adjustment, Document, FrozenLine, ManualLine, VehicleMaster } from "../domain/types";

/**
 * 正規化ストア（byId）から、利用側が扱いやすい配列ビューを導出する単一の入口。
 * 配列はソース Record／順序配列の参照に紐づけてキャッシュし、内容が変わるまで
 * 同一参照を返す（不要な再レンダリングを避ける）。
 */

// byId と順序配列の両方に紐づくキャッシュ（どちらかが差し替われば再計算）。
const _orderedCache = new WeakMap<object, { order: readonly string[]; arr: unknown[] }>();
function ordered<T>(byId: Record<string, T>, order: readonly string[]): T[] {
  const hit = _orderedCache.get(byId);
  if (hit && hit.order === order) return hit.arr as T[];
  const arr = order.map((id) => byId[id]).filter(Boolean) as T[];
  _orderedCache.set(byId, { order, arr });
  return arr;
}

// 順序を持たない集合（挿入順の Object.values）を byId 参照でキャッシュ。
const _valuesCache = new WeakMap<object, unknown[]>();
function values<T>(byId: Record<string, T>): T[] {
  let v = _valuesCache.get(byId) as T[] | undefined;
  if (!v) { v = Object.values(byId); _valuesCache.set(byId, v); }
  return v;
}

/** 書類一覧（表示順）。 */
export const useDocs = (): Document[] => useAppStore((s) => ordered(s.documents, s.docOrder));

/** 全明細（集計・全走査用。順序非依存）。 */
export const useLines = (): FrozenLine[] => useAppStore((s) => values(s.linesById));

/** 指定書類の明細（書類内の順序を保持）。 */
export const useLinesOfDoc = (docId: string): FrozenLine[] =>
  useAppStore((s) => ordered(s.linesById, s.lineIdsByDoc[docId] ?? EMPTY));
const EMPTY: readonly string[] = [];

/** 手動明細。 */
export const useManualLines = (): ManualLine[] => useAppStore((s) => values(s.manualLinesById));

/** override 調整。 */
export const useAdjustments = (): Adjustment[] => useAppStore((s) => values(s.adjustmentsById));

/** 車両マスタ（登録順）。 */
export const useVehicleMasters = (): VehicleMaster[] =>
  useAppStore((s) => ordered(s.vehiclesById, s.vehicleOrder));

/** 車両マスタから導出した車番→車両ID インデックス（メモ化）。 */
export function usePlateIndex(): PlateIndex {
  const masters = useVehicleMasters();
  return useMemo(() => buildPlateIndex(masters), [masters]);
}

/**
 * コストモニターの車両集計（メモ化）。明細・調整・手動明細と車両マスタを結合して導出。
 */
export function useVehicles(
  catFilter: string = "all",
  range: { start: string; end: string } | null = null,
): Vehicle[] {
  const docs = useDocs();
  const lines = useLines();
  const manualLines = useManualLines();
  const adjustments = useAdjustments();
  const masters = useVehicleMasters();
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
