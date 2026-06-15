import type { Vehicle } from "./vehicles";
import { yen } from "./format";
import { PICKUP_LABEL, type PickupListId, type PickupSnapshot } from "./pickup";

/**
 * 連携アラート機能のドメインロジック（純関数）。
 * すべて「(車両 × コスト分類 × 月) の実額スナップショット」の差分から導出する。
 *   ① 特定分類が前月比 / 前3ヶ月平均比で増加（inc_mom / inc_avg3）
 *   ② ピックアップ3リストの変化（pickup_change）
 * 同一アルゴリズムを index.html プロトタイプにも移植する。
 */

export type AlertKind = "inc_mom" | "inc_avg3" | "pickup_change";

export interface AlertTarget {
  type: "veh_karte" | "pickup";
  vehKey?: string;
  listId?: PickupListId;
}

export interface Alert {
  id: string; // 内容アドレス方式。同一条件の再生成は同一ID＝自動dedupe・既読安定
  kind: AlertKind;
  title: string;
  detail: string;
  vehTarget?: string;
  ym?: string;
  createdAt: string;
  target: AlertTarget;
}

export const ALERT_CFG = {
  ratioThreshold: 0.1, // +10%以上
  minAbsIncrease: 30_000, // 増加額の絶対フロア（少額ノイズ抑止）
  minBaseAmount: 30_000, // 比較元がこの未満ならゼロ近似として除外
  momMinMonths: 2, // ①-a: 当月+前月
  avg3MinMonths: 4, // ①-b: 当月+前3ヶ月
  perVehicleCap: 3, // 1車両あたり①上限
  totalCap: 50, // 保持総数の上限
} as const;

// key = `${vehKey}|${cat}|${ym}`、ym="YYYY-MM"
export type CostMap = Record<string, number>;

const ymOf = (d: string) => (d || "").slice(0, 7);

/** 実明細から (車両×分類×月) の実額マップを構築。 */
export function buildCostMap(vehicles: Vehicle[]): CostMap {
  const m: CostMap = {};
  for (const v of vehicles) {
    for (const ln of v.lines) {
      const ym = ymOf(ln.date);
      if (!ym) continue;
      const k = `${v.key}|${ln.cat}|${ym}`;
      m[k] = (m[k] ?? 0) + (+ln.amount || 0);
    }
  }
  return m;
}

export function mapsEqual(a: CostMap, b: CostMap): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** ym を back ヶ月前にずらす（"YYYY-MM"）。 */
function shiftYm(ym: string, back: number): string {
  let y = +ym.slice(0, 4);
  let m = +ym.slice(5, 7) - back;
  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** 比較元 base に対し当月 amt が増加条件を満たすなら増加率を返す（満たさなければ null）。 */
function qualify(amt: number, base: number): number | null {
  if (base < ALERT_CFG.minBaseAmount) return null; // ゼロ近似除外
  const inc = amt - base;
  if (inc < ALERT_CFG.minAbsIncrease) return null; // 少額ノイズ除外
  const rate = inc / base;
  if (rate < ALERT_CFG.ratioThreshold) return null;
  return rate;
}

interface IncCand {
  vehKey: string;
  cat: string;
  ym: string;
  kind: "inc_mom" | "inc_avg3";
  amt: number;
  base: number;
  rate: number;
}

function splitCell(k: string): { vehKey: string; cat: string; ym: string } {
  const parts = k.split("|");
  const ym = parts[parts.length - 1];
  const cat = parts[parts.length - 2];
  const vehKey = parts.slice(0, parts.length - 2).join("|");
  return { vehKey, cat, ym };
}

function increaseAlerts(prev: CostMap, cur: CostMap, targetByKey: Map<string, string>): Alert[] {
  // (車両×分類) ごとの保有月数
  const monthCount = new Map<string, number>();
  for (const k of Object.keys(cur)) {
    if ((cur[k] ?? 0) <= 0) continue;
    const i = k.lastIndexOf("|");
    const vc = k.slice(0, i);
    monthCount.set(vc, (monthCount.get(vc) ?? 0) + 1);
  }

  const byCell = new Map<string, IncCand>();
  for (const k of Object.keys(cur)) {
    const amt = cur[k];
    if ((prev[k] ?? 0) === amt) continue; // 連携で変化したセルだけ評価
    const { vehKey, cat, ym } = splitCell(k);
    if (!cat || !ym) continue;
    const mc = monthCount.get(`${vehKey}|${cat}`) ?? 0;
    const cands: { kind: "inc_mom" | "inc_avg3"; base: number; rate: number }[] = [];
    if (mc >= ALERT_CFG.momMinMonths) {
      const base = cur[`${vehKey}|${cat}|${shiftYm(ym, 1)}`] ?? 0;
      const r = qualify(amt, base);
      if (r != null) cands.push({ kind: "inc_mom", base, rate: r });
    }
    if (mc >= ALERT_CFG.avg3MinMonths) {
      const base = [1, 2, 3].reduce((a, d) => a + (cur[`${vehKey}|${cat}|${shiftYm(ym, d)}`] ?? 0), 0) / 3;
      const r = qualify(amt, base);
      if (r != null) cands.push({ kind: "inc_avg3", base, rate: r });
    }
    if (!cands.length) continue;
    // ①-a/①-b 重複は増加率が高い方を主にする
    const best = cands.sort((a, b) => b.rate - a.rate)[0];
    byCell.set(k, { vehKey, cat, ym, amt, ...best });
  }

  // 車両あたり上限（増加率上位のみ残す）
  const byVeh = new Map<string, IncCand[]>();
  for (const c of byCell.values()) {
    const arr = byVeh.get(c.vehKey) ?? [];
    arr.push(c);
    byVeh.set(c.vehKey, arr);
  }
  const createdAt = stamp();
  const out: Alert[] = [];
  for (const arr of byVeh.values()) {
    arr.sort((a, b) => b.rate - a.rate);
    for (const c of arr.slice(0, ALERT_CFG.perVehicleCap)) {
      const target = targetByKey.get(c.vehKey) ?? c.vehKey;
      const label = c.kind === "inc_mom" ? "前月比" : "前3ヶ月平均比";
      const baseLabel = c.kind === "inc_mom" ? "前月" : "前3ヶ月平均";
      out.push({
        id: `${c.kind}|${c.vehKey}|${c.cat}|${c.ym}`,
        kind: c.kind,
        title: `${c.cat}が${label} +${Math.round(c.rate * 100)}%`,
        detail: `車番 ${target}・${c.ym}　${yen(c.amt)}（${baseLabel} ${yen(Math.round(c.base))}）`,
        vehTarget: target,
        ym: c.ym,
        createdAt,
        target: { type: "veh_karte", vehKey: c.vehKey },
      });
    }
  }
  return out;
}

function pickupAlerts(prev: PickupSnapshot, cur: PickupSnapshot, targetByKey: Map<string, string>): Alert[] {
  const out: Alert[] = [];
  const createdAt = stamp();
  const lists: PickupListId[] = ["attention", "topcost", "increase"];
  for (const listId of lists) {
    const p = prev[listId];
    const c = cur[listId];
    const pset = new Set(p);
    const cset = new Set(c);
    const entered = new Set(c.filter((k) => !pset.has(k)));
    const label = PICKUP_LABEL[listId];
    const mk = (ct: "enter" | "leave" | "top", vehKey: string, title: string): Alert => ({
      id: `pickup_change|${listId}|${ct}|${vehKey}`,
      kind: "pickup_change",
      title,
      detail: "コストモニターで確認できます",
      vehTarget: targetByKey.get(vehKey) ?? vehKey,
      createdAt,
      target: { type: "pickup", listId, vehKey },
    });
    // (a) 新規IN
    for (const k of entered) out.push(mk("enter", k, `${targetByKey.get(k) ?? k} が「${label}」に入りました`));
    // (b) 脱落
    for (const k of p.filter((x) => !cset.has(x))) out.push(mk("leave", k, `${targetByKey.get(k) ?? k} が「${label}」から外れました`));
    // (c) 1位交代（新規INで既に通知済みの車両は除く）
    if (c[0] && p[0] && c[0] !== p[0] && !entered.has(c[0])) {
      out.push(mk("top", c[0], `「${label}」の1位が ${targetByKey.get(c[0]) ?? c[0]} になりました`));
    }
  }
  return out;
}

/** 差分から①②アラートを生成（baseline 確立後にのみ呼ぶ）。 */
export function diffAlerts(
  prevCost: CostMap,
  curCost: CostMap,
  prevPk: PickupSnapshot,
  curPk: PickupSnapshot,
  vehicles: Vehicle[],
): Alert[] {
  const targetByKey = new Map(vehicles.map((v) => [v.key, v.target]));
  return [...increaseAlerts(prevCost, curCost, targetByKey), ...pickupAlerts(prevPk, curPk, targetByKey)];
}
