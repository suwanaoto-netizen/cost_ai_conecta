import { useMemo, useState } from "react";
import { yen } from "../../domain/format";
import {
  SERIES_CATS,
  SERIES_KLASSES,
  THIS_YEAR_MONTHS,
  officeLines,
  monthShort,
} from "../../domain/monthlySeries";

const W = 600, H = 300;
const ML = 52, MR = 12, MT = 14, MB = 40;
const PW = W - ML - MR;
const PH = H - MT - MB;

const man = (n: number) => `${Math.round(n / 10000).toLocaleString()}万`;

/** ② 営業所別のコスト分類推移：月次12ヶ月。コスト分類＆車格で絞り込み。 */
export function OfficeCategoryLineChart() {
  const [cat, setCat] = useState(SERIES_CATS[0]);
  const [klass, setKlass] = useState("all");

  const { lines, yMax } = useMemo(() => {
    const lines = officeLines(cat, klass);
    const max = Math.max(1, ...lines.flatMap((l) => l.points.map((p) => p.amount)));
    const nice = Math.ceil(max / 100000) * 100000;
    return { lines, yMax: nice };
  }, [cat, klass]);

  const n = THIS_YEAR_MONTHS.length;
  const xOf = (i: number) => ML + (n === 1 ? PW / 2 : (i / (n - 1)) * PW);
  const yOf = (v: number) => MT + PH - (v / yMax) * PH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);

  return (
    <div className="chart-card">
      <div className="chart-head">
        <div>
          <div className="chart-title">営業所別 コスト分類推移</div>
          <div className="chart-sub">月次・直近12ヶ月</div>
        </div>
        <div className="chart-filters">
          <div className="filter-sel chart-sel">
            <span className="fs-l">分類</span>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              {SERIES_CATS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="filter-sel chart-sel">
            <span className="fs-l">車格</span>
            <select value={klass} onChange={(e) => setKlass(e.target.value)}>
              <option value="all">全車格</option>
              {SERIES_KLASSES.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="営業所別コスト分類推移グラフ">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={ML} y1={yOf(t)} x2={W - MR} y2={yOf(t)} stroke="var(--lineSoft)" strokeWidth={1} />
            <text x={ML - 6} y={yOf(t) + 3} textAnchor="end" fontSize={9} fill="var(--inkSoft)">{man(t)}</text>
          </g>
        ))}
        {THIS_YEAR_MONTHS.map((ym, i) => (
          <text key={ym} x={xOf(i)} y={H - MB + 14} textAnchor="middle" fontSize={9.5} fill="var(--inkSoft)">
            {monthShort(ym)}
          </text>
        ))}
        {lines.map((l) => (
          <g key={l.office}>
            <polyline
              fill="none"
              stroke={l.color}
              strokeWidth={2}
              strokeLinejoin="round"
              points={l.points.map((p, i) => `${xOf(i)},${yOf(p.amount)}`).join(" ")}
            />
            {l.points.map((p, i) => (
              <circle key={p.ym} cx={xOf(i)} cy={yOf(p.amount)} r={2.5} fill={l.color}>
                <title>{`${l.office} ${monthShort(p.ym)}：${yen(p.amount)}`}</title>
              </circle>
            ))}
          </g>
        ))}
        <line x1={ML} y1={MT + PH} x2={W - MR} y2={MT + PH} stroke="var(--line)" strokeWidth={1} />
      </svg>

      <div className="chart-legend">
        {lines.map((l) => (
          <span className="cl-item" key={l.office}>
            <span className="cl-sw" style={{ background: l.color }} />
            {l.office}
          </span>
        ))}
      </div>
    </div>
  );
}
