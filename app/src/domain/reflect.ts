import type { Line } from "./types";
import { matchOf, type PlateIndex } from "./match";
import { yen } from "./format";

export interface ReflectStep {
  phase: 0 | 1 | 2;
  text: string;
  ok: string;
}

/**
 * データ連携プランを構築（プロトタイプ buildPlanFromLines を移植）。
 * 新規マスタ作成は high-confidence の new のみ。suspect はスキップ、existing-suspect は要確認付き追記。
 */
export function buildReflectPlan(lines: Line[], plateIndex: PlateIndex, threshold: number): ReflectStep[] {
  const out: ReflectStep[] = [];
  let vid = 10290;
  const ws = lines.map((l) => ({ l, st: matchOf(l, plateIndex, threshold) }));

  const vNew = ws.filter((x) => x.st === "new" && (x.l.plate || "").trim());
  [...new Set(vNew.map((x) => x.l.plate))].forEach((p) => {
    vid++;
    out.push({ phase: 1, text: `POST /vehicles  新規車両マスタ ${p}`, ok: `→ vehicle_id: V-${vid} を発行` });
    vNew
      .filter((x) => x.l.plate === p)
      .forEach((x) => out.push({ phase: 2, text: `POST /costs  V-${vid} ← ${x.l.item}`, ok: `→ ${yen(x.l.amount)} を紐付け` }));
  });
  ws.filter((x) => x.st === "existing" || x.st === "existing-suspect").forEach((x) => {
    const warn = x.st === "existing-suspect" ? "（要確認）" : "";
    out.push({ phase: 2, text: `POST /costs  ${x.l.plate} ← ${x.l.item}`, ok: `→ ${yen(x.l.amount)} を既存マスタに追記${warn}` });
  });
  ws.filter((x) => x.st === "suspect").forEach((x) =>
    out.push({ phase: 0, text: `SKIP  ${x.l.item}（車番要確認）`, ok: `→ 読み取り信頼度が低いため連携をスキップ` }),
  );
  return out;
}
