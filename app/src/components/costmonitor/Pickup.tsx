import { useState } from "react";
import type { Vehicle } from "../../domain/vehicles";
import { yen } from "../../domain/format";
import { IconTruck, IconAlert, IconChevron } from "../common/Icon";

const ymOf = (d: string) => (d || "").slice(0, 7);
const moJP = (ym: string) => (ym ? `${+ym.slice(5, 7)}月` : "—");

/** ピックアップ（要確認車両／コスト上位／コスト増加）。クリックで車両カルテを開く。 */
export function Pickup({ vehicles, onOpen }: { vehicles: Vehicle[]; onOpen: (v: Vehicle) => void }) {
  const [collapsed, setCollapsed] = useState(false);

  const moList = [...new Set(vehicles.flatMap((v) => v.lines).map((l) => ymOf(l.date)).filter(Boolean))].sort();
  const lastYM = moList[moList.length - 1] || "";
  const prevYM = moList[moList.length - 2] || "";
  const vSum = (v: Vehicle, ym: string) => (ym ? v.lines.reduce((a, l) => a + (ymOf(l.date) === ym ? +l.amount || 0 : 0), 0) : 0);
  const pct = (c: number, p: number) => (p > 0 ? ((c - p) / p) * 100 : 0);

  const topCost = [...vehicles].sort((a, b) => b.total - a.total).slice(0, 3);
  const incRank = vehicles
    .map((v) => ({ v, p: pct(vSum(v, lastYM), vSum(v, prevYM)) }))
    .filter((x) => vSum(x.v, prevYM) > 0 && x.p > 0)
    .sort((a, b) => b.p - a.p);
  const maintRank = vehicles
    .map((v) => ({ v, r: v.total > 0 ? (v.byCat["修繕・維持費"] || 0) / v.total : 0 }))
    .filter((x) => x.r > 0)
    .sort((a, b) => b.r - a.r);

  const item = (v: Vehicle, inner: JSX.Element) => (
    <div className="pk-item" onClick={() => onOpen(v)}>
      {inner}
      <span className="pk-detail">詳細<IconChevron /></span>
    </div>
  );
  const empty = <div className="pk-empty">該当する車両はありません</div>;

  const att: JSX.Element[] = [];
  if (topCost[0]) att.push(<div key="a0">{item(topCost[0], <><span className="pk-rank">1</span><div className="pk-main"><div className="pk-plate">{topCost[0].target}</div><div className="pk-metric">累計コスト {yen(topCost[0].total)}・全車両中 1位</div></div></>)}</div>);
  if (incRank[0]) att.push(<div key="a1">{item(incRank[0].v, <><span className="pk-rank">2</span><div className="pk-main"><div className="pk-plate">{incRank[0].v.target}</div><div className="pk-metric">前月比 +{Math.round(incRank[0].p)}%</div></div></>)}</div>);
  if (maintRank[0]) att.push(<div key="a2">{item(maintRank[0].v, <><span className="pk-rank">3</span><div className="pk-main"><div className="pk-plate">{maintRank[0].v.target}</div><div className="pk-metric">整備費比率 {Math.round(maintRank[0].r * 100)}%</div></div></>)}</div>);

  return (
    <>
      <button className={`pickup-toggle ${collapsed ? "collapsed" : ""}`} onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
        <IconChevron /><span>ピックアップ</span>
      </button>
      {!collapsed && (
        <div className="pickup">
          <div className="pk-card pk-card-alert">
            <div className="pk-h"><IconAlert color="#B23A2E" size={14} /> 要確認車両</div>
            <div className="pk-list">{att.length ? att : empty}</div>
          </div>
          <div className="pk-card">
            <div className="pk-h"><IconTruck color="#0E7A4B" size={15} /> コスト上位車両</div>
            <div className="pk-list">{topCost.length ? topCost.map((v, i) => <div key={v.key}>{item(v, <><span className="pk-rank wide">{i + 1}位</span><div className="pk-main"><div className="pk-plate">{v.target}</div></div><span className="pk-amt">{yen(v.total)}</span></>)}</div>) : empty}</div>
          </div>
          <div className="pk-card">
            <div className="pk-h" title={`先月（${moJP(lastYM)}）を、その前月（${moJP(prevYM)}）と比較した前月比の増加率です`}>
              <IconAlert color="#B87514" size={14} /> コスト増加車両 <span className="pk-hsub">前月比（先月：{moJP(lastYM)}）</span>
            </div>
            <div className="pk-list">{incRank.length ? incRank.slice(0, 3).map((x) => <div key={x.v.key}>{item(x.v, <><span className="pk-pct">+{Math.round(x.p)}%</span><div className="pk-main"><div className="pk-plate">{x.v.target}</div></div></>)}</div>) : empty}</div>
          </div>
        </div>
      )}
    </>
  );
}
