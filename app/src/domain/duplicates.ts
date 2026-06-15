/**
 * 重複書類の検知。
 * 車番(plate)・金額(amount)・発生日(inspectedAt)が完全一致する明細を「重複」とみなし、
 * 明細を1件でも重複として持つ書類を「重複書類」と判定する。
 * 比較対象は既に連携済み（status==="連携済み" かつ !deleted）の明細のみ。
 */
import type { Document, Line } from "./types";
import { normPlate } from "./match";

type SigLine = Pick<Line, "plate" | "amount" | "inspectedAt">;

/**
 * 重複判定キー：正規化車番|金額|発生日。
 * 車番は突合と同じ正規化（normPlate）で OCR ゆらぎを吸収する。
 */
export function signatureOf(line: SigLine): string {
  return `${normPlate(line.plate)}|${line.amount}|${line.inspectedAt}`;
}

/** 車番が空の明細は車両を特定できないため、重複アンカーから除外する。 */
function hasPlate(line: SigLine): boolean {
  return normPlate(line.plate) !== "";
}

/**
 * 連携済み書類の明細から重複判定用の署名集合を構築する。
 */
export function buildReflectedSignatures(
  docs: Array<Pick<Document, "id" | "status" | "deleted">>,
  lines: Array<Pick<Line, "docId" | "plate" | "amount" | "inspectedAt">>,
): Set<string> {
  const reflected = new Set(
    docs.filter((d) => d.status === "連携済み" && !d.deleted).map((d) => d.id),
  );
  const sig = new Set<string>();
  for (const l of lines) {
    if (l.docId && reflected.has(l.docId) && hasPlate(l)) sig.add(signatureOf(l));
  }
  return sig;
}

/** 明細群のうち、署名集合に一致するものが1件でもあれば true。 */
export function linesHaveDuplicate(lines: SigLine[], reflectedSig: Set<string>): boolean {
  return lines.some((l) => hasPlate(l) && reflectedSig.has(signatureOf(l)));
}

/**
 * 候補書類のうち、明細を1件でも重複として持つ書類IDを返す。
 */
export function findDuplicateDocIds(
  candidates: Array<{ id: string; lines: SigLine[] }>,
  reflectedSig: Set<string>,
): string[] {
  return candidates.filter((c) => linesHaveDuplicate(c.lines, reflectedSig)).map((c) => c.id);
}
