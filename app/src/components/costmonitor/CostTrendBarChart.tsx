import { useMemo, useState } from "react";
import { catStyleOf } from "../../domain/catStyle";
import { yen } from "../../domain/format";
import {
  SERIES_CATS,
  SERIES_OFFICES,
  THIS_YEAR_MONTHS,
  PREV_YEAR_MONTHS,
  stackByMonth,
  monthShort,
} from "../../domain/monthlySeries";

const W = 600, H = 300;
const ML = 52, MR = 12, MT = 14, MB = 40;
const PW = W - ML - MR;
const PH = H - MT - MB;

const man = (n: number) => `${Math.round(n / 10000).toLocaleString()}万`;

/** ① 原価（グロス＋分類構成比）推移：月次12ヶ月、昨年同月を並べて比較。営業所で絞り込み可能。 */
export function CostTrendBarChart() {
  const [office, setOffice] = useState("all");

  const { groups, yMax } = useMemo(() => {
    const stacks = stackByMonth(office);
    const map = new Map(stacks.map((s) => [s.ym, s]));
    const groups = THIS_YEAR_MONTHS.map((ym, j) => ({
      ym,
      cur: map.get(ym)!,
      prev: map.get(PREV_YEAR_MONTHS[j])!,
    }));
    const yMax = Math.max(1, ...stacks.map((s) => s.gross));
    const nice = Math.ceil(yMax / 500000) * 500000;
    return { groups, yMax: nice };
  }, [office]);

  const groupW = PW / 12;
  const barW = Math.min(15, groupW / 2.6);
  const gap = 4;
  const yOf = (v: number) => MT + PH - (v / yMax) * PH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);

  const stackBar = (x: number, byCat: Record<string, number>, gross: number, faded: boolean) => {
    let acc = 0;
    return (
      <g opacity={faded ? 0.4 : 1}>
        {SERIES_CATS.map((c) => {
          const v = byCat[c] || 0;
          if (v <= 0) return null;
          const h = (v / yMax) * PH;
          const y = yOf(acc + v);
          acc += v;
          const pct = gross > 0 ? ((v / gross) * 100).toFixed(1) : "0";
          return (
            <rect key={c} x={x} y={y} width={barW} height={h} fill={catStyleOf(c).fg}>
              <title>{`${c}：${yen(v)}（${pct}%）`}</title>
            </rect>
          );
        })}
      </g>
    );
  };

  return (
    <div className="chart-card">
      <div className="chart-head">
        <div>
          <div className="chart-title">原価推移（分類構成比）</div>
          <div className="chart-sub">月次・直近12ヶ月／薄い棒＝昨年同月</div>
        </div>
        <div className="filter-sel chart-sel">
          <span className="fs-l">営業所</span>
          <select value={office} onChange={(e) => setOffice(e.target.value)}>
            <option value="all">全社</option>
            {SERIES_OFFICES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>

      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="原価推移グラフ">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={ML} y1={yOf(t)} x2={W - MR} y2={yOf(t)} stroke="var(--lineSoft)" strokeWidth={1} />
            <text x={ML - 6} y={yOf(t) + 3} textAnchor="end" fontSize={9} fill="var(--inkSoft)">{man(t)}</text>
          </g>
        ))}
        {groups.map((g, j) => {
          const gx = ML + j * groupW;
          const cx = gx + groupW / 2;
          const xPrev = cx - barW - gap / 2;
          const xCur = cx + gap / 2;
          return (
            <g key={g.ym}>
              {stackBar(xPrev, g.prev.byCat, g.prev.gross, true)}
              {stackBar(xCur, g.cur.byCat, g.cur.gross, false)}
              <text x={xCur + barW / 2} y={yOf(g.cur.gross) - 4} textAnchor="middle" fontSize={8} fill="var(--ink)" fontWeight={700}>
                {man(g.cur.gross)}
              </text>
              <text x={cx} y={H - MB + 14} textAnchor="middle" fontSize={9.5} fill="var(--inkSoft)">{monthShort(g.ym)}</text>
            </g>
          );
        })}
        <line x1={ML} y1={MT + PH} x2={W - MR} y2={MT + PH} stroke="var(--line)" strokeWidth={1} />
      </svg>

      <div className="chart-legend">
        {SERIES_CATS.map((c) => (
          <span className="cl-item" key={c}>
            <span className="cl-sw" style={{ background: catStyleOf(c).fg }} />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
