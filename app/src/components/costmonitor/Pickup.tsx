import type { Vehicle } from "../../domain/vehicles";
import { yen } from "../../domain/format";
import { computePickup } from "../../domain/pickup";
import { IconTruck, IconAlert, IconChevron } from "../common/Icon";

const moJP = (ym: string) => (ym ? `${+ym.slice(5, 7)}月` : "—");

/** ピックアップ（要確認車両／コスト上位／コスト増加）。クリックで車両カルテを開く。 */
export function Pickup({ vehicles, onOpen }: { vehicles: Vehicle[]; onOpen: (v: Vehicle) => void }) {
  const { topCost, incRank, maintRank, lastYM, prevYM } = computePickup(vehicles);

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
    <div className="pickup">
      <div className="pk-card pk-card-alert" id="pk-attention">
        <div className="pk-h"><IconAlert color="#B23A2E" size={14} /> 要確認車両</div>
        <div className="pk-list">{att.length ? att : empty}</div>
      </div>
      <div className="pk-card" id="pk-topcost">
        <div className="pk-h"><IconTruck color="#0E7A4B" size={15} /> コスト上位車両</div>
        <div className="pk-list">{topCost.length ? topCost.map((v, i) => <div key={v.key}>{item(v, <><span className="pk-rank wide">{i + 1}位</span><div className="pk-main"><div className="pk-plate">{v.target}</div></div><span className="pk-amt">{yen(v.total)}</span></>)}</div>) : empty}</div>
      </div>
      <div className="pk-card" id="pk-increase">
        <div className="pk-h" title={`先月（${moJP(lastYM)}）を、その前月（${moJP(prevYM)}）と比較した前月比の増加率です`}>
          <IconAlert color="#B87514" size={14} /> コスト増加車両 <span className="pk-hsub">前月比（先月：{moJP(lastYM)}）</span>
        </div>
        <div className="pk-list">{incRank.length ? incRank.slice(0, 3).map((x) => <div key={x.v.key}>{item(x.v, <><span className="pk-pct">+{Math.round(x.p)}%</span><div className="pk-main"><div className="pk-plate">{x.v.target}</div></div></>)}</div>) : empty}</div>
      </div>
    </div>
  );
}
