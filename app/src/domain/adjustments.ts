import type { Adjustment, Line, Overridable } from "./types";

/** 指定明細の override 調整を取得（なければ null）。 */
export function findOverride(
  adjustments: Adjustment[],
  docId: string,
  lid: string | number,
): Adjustment | null {
  return (
    adjustments.find(
      (a) => a.type === "override" && a.docId === docId && a.lid === String(lid),
    ) ?? null
  );
}

/** 凍結された元明細に override 調整を重ねた実効値を返す（元オブジェクトは変更しない）。 */
export function effDocLine(line: Line, docId: string, adjustments: Adjustment[]): Line {
  const a = findOverride(adjustments, docId, line.lid);
  return a ? { ...line, ...a.patch } : line;
}

/**
 * override 調整を適用した新しい調整配列を返す（イミュータブル）。
 * - 値が元と同じになったフィールドは patch から除去
 * - patch が空になった調整は配列から除去（＝完全 undo）
 * 元データ（連携済み明細）は一切変更しない。
 */
export function applyOverride(
  adjustments: Adjustment[],
  origLine: Line,
  docId: string,
  field: Overridable,
  value: string | number,
  meta: { ts: string; user: string; newId: string },
): Adjustment[] {
  const lid = String(origLine.lid);
  const same =
    field === "amount"
      ? +origLine[field] === +value
      : String(origLine[field] ?? "") === String(value ?? "");

  const others = adjustments.filter(
    (a) => !(a.type === "override" && a.docId === docId && a.lid === lid),
  );
  const cur = findOverride(adjustments, docId, lid);
  const patch: Partial<Pick<Line, Overridable>> = { ...(cur?.patch ?? {}) };

  if (same) delete patch[field];
  else (patch[field] as string | number) = value;

  if (Object.keys(patch).length === 0) return others; // 完全に原状回復 → 調整自体を破棄

  const next: Adjustment = {
    id: cur?.id ?? meta.newId,
    docId,
    lid,
    type: "override",
    patch,
    ts: meta.ts,
    user: meta.user,
  };
  return [...others, next];
}
