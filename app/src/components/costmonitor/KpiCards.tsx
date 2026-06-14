import type { Vehicle } from "../../domain/vehicles";
import { yen } from "../../domain/format";

const moJP = (ym: string) => (ym ? +ym.slice(5, 7) + "月" : "—");

function TrendIcon({ up }: { up: boolean }) {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      {up ? (
        <>
          <path d="M16 7h6v6" />
          <path d="m22 7-8.5 8.5-5-5L2 17" />
        </>
      ) : (
        <>
          <path d="M16 17h6v-6" />
          <path d="m22 17-8.5-8.5-5 5L2 7" />
        </>
      )}
    </svg>
  );
}

function Trend({ delta, unit }: { delta: number; unit: "%" | "台" }) {
  const flat = Math.abs(delta) < (unit === "%" ? 0.05 : 0.5);
  const up = delta > 0;
  const cls = flat ? "flat" : up ? "up" : "down";
  const sign = up ? "+" : delta < 0 ? "−" : "";
  const num = unit === "%" ? Math.abs(delta).toFixed(1) : String(Math.abs(Math.round(delta)));
  return (
    <span className={`mk-tr ${cls}`}>
      前月比{" "}
      <b>
        {sign}
        {num}
        {unit}
      </b>
      {!flat && <TrendIcon up={up} />}
    </span>
  );
}

export function KpiCards({ vehicles }: { vehicles: Vehicle[] }) {
  const moList = [...new Set(vehicles.flatMap((v) => v.lines).map((l) => (l.date || "").slice(0, 7)).filter(Boolean))].sort();
  const lastYM = moList[moList.length - 1] || "";
  const prevYM = moList[moList.length - 2] || "";
  const prev2YM = moList[moList.length - 3] || "";
  const vSum = (v: Vehicle, ym: string) => (ym ? v.lines.reduce((a, l) => a + ((l.date || "").slice(0, 7) === ym ? +l.amount || 0 : 0), 0) : 0);
  const sumAll = (ym: string) => vehicles.reduce((s, v) => s + vSum(v, ym), 0);
  const activeN = (ym: string) => vehicles.filter((v) => vSum(v, ym) > 0).length;
  const lastTotal = sumAll(lastYM);
  const prevTotal = sumAll(prevYM);
  const lastAvg = activeN(lastYM) ? lastTotal / activeN(lastYM) : 0;
  const prevAvg = activeN(prevYM) ? prevTotal / activeN(prevYM) : 0;
  const incNow = vehicles.filter((v) => vSum(v, lastYM) > vSum(v, prevYM)).length;
  const incPrev = vehicles.filter((v) => vSum(v, prevYM) > vSum(v, prev2YM)).length;
  const collecting = vehicles.filter((v) => v.lines.length <= 2).length;
  const pct = (c: number, p: number) => (p > 0 ? ((c - p) / p) * 100 : 0);

  return (
    <div className="mon-kpis">
      <div className="mk">
        <div className="mk-l">登録車両数</div>
        <div className="mk-v">
          {vehicles.length}
          <small>台</small>
        </div>
      </div>
      <div className="mk">
        <div className="mk-l">
          先月のコスト合計 <span className="mk-sub">（先月：{moJP(lastYM)}）</span>
        </div>
        <div className="mk-v">{yen(lastTotal)}</div>
        <Trend delta={pct(lastTotal, prevTotal)} unit="%" />
      </div>
      <div className="mk">
        <div className="mk-l">平均コスト（1台あたり）</div>
        <div className="mk-v">{yen(lastAvg)}</div>
        <Trend delta={pct(lastAvg, prevAvg)} unit="%" />
      </div>
      <div className="mk">
        <div className="mk-l">コスト増加車両</div>
        <div className="mk-v">
          {incNow}
          <small>台</small>
        </div>
        <Trend delta={incNow - incPrev} unit="台" />
      </div>
      <div className="mk">
        <div className="mk-l">データ収集中の車両</div>
        <div className="mk-v">
          {collecting}
          <small>台</small>
        </div>
        <span className="mk-note">連携明細が2件以下の車両</span>
      </div>
    </div>
  );
}
