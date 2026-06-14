import type { Line } from "./types";
import { normPlate } from "./match";

export const docTotal = (lines: Line[]): number => lines.reduce((s, l) => s + (+l.amount || 0), 0);
export const docDate = (lines: Line[]): string => lines.map((l) => l.inspectedAt).sort()[0] ?? "";

/** OCRが読み取った金額候補（各明細額・合計・税・税込）。 */
export function ocrAmountCandidates(lines: Line[]): number[] {
  const amts = lines.map((l) => +l.amount || 0).filter((a) => a > 0);
  const total = amts.reduce((s, a) => s + a, 0);
  const tax = Math.round(total * 0.1);
  return [...new Set([...amts, total, tax, total + tax])].filter((a) => a > 0).sort((a, b) => b - a);
}

/** 最長共通部分文字列長（車番候補の一致スコア）。 */
function lcsLen(a: string, b: string): number {
  if (!a || !b) return 0;
  let best = 0;
  const dp = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : 0;
      if (dp[j] > best) best = dp[j];
      prev = tmp;
    }
  }
  return best;
}

/** 入力値に2文字以上一致する登録車番候補（一致順）。 */
export function plateSuggestions(input: string, plates: string[]): string[] {
  const v = (input || "").trim();
  if (v.length < 1) return [];
  return plates
    .map((p) => ({ p, s: lcsLen(v, p) }))
    .filter((x) => x.s >= 2)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p);
}

/** 書類内の明細のコスト分類から想定書類タイプを集約。 */
export function expectedDocTypes(lines: Line[], catDocTypes: Record<string, string[]>): string[] {
  const out: string[] = [];
  [...new Set(lines.map((l) => l.cat))].forEach((c) =>
    (catDocTypes[c] ?? []).forEach((t) => {
      if (!out.includes(t)) out.push(t);
    }),
  );
  return out;
}

export { normPlate };
