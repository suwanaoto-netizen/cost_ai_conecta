import type { Adjustment, FrozenLine, Line, Overridable } from "./types";
import { resolveSubcat } from "./repairSubcat";

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
export function effDocLine(line: FrozenLine, docId: string, adjustments: Adjustment[]): FrozenLine {
  const a = findOverride(adjustments, docId, line.lid);
  if (!a) return line;
  const eff = { ...line, ...a.patch };
  // cat/item が override された場合、内訳が patch で明示指定されていなければ再判定する。
  if (("cat" in a.patch || "item" in a.patch) && !("subCat" in a.patch)) {
    eff.subCat = resolveSubcat(eff.cat, eff.item) ?? null;
  }
  return eff;
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

/**
 * 指定書類の現存明細（keepLids）に対応しない override 調整を取り除く。
 * 明細の差し替え・削除で参照先を失った孤児調整が `adjustments` に残り続けるのを防ぐ
 * （参照整合のための GC）。他書類の調整はそのまま保持する。
 */
export function pruneAdjustments(
  adjustments: Adjustment[],
  docId: string,
  keepLids: Iterable<string | number>,
): Adjustment[] {
  const keep = new Set<string>();
  for (const lid of keepLids) keep.add(String(lid));
  return adjustments.filter((a) => a.docId !== docId || keep.has(a.lid));
}
