import { useState } from "react";

export interface DateRange {
  start: string | null;
  end: string | null;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const TODAY = iso(new Date());

/** 発生期間（範囲）を選ぶポップオーバーカレンダー。 */
export function PeriodCalendar({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [ym, setYm] = useState(() => (range.start || TODAY).slice(0, 7));
  const [y, m] = ym.split("-").map(Number);
  const hasRange = !!(range.start && range.end);

  const pickDay = (d: string) => {
    const { start, end } = range;
    if (!start || (start && end)) onChange({ start: d, end: null });
    else if (d < start) onChange({ start: d, end: start });
    else onChange({ start, end: d });
  };
  const pickMonth = (offset: number) => {
    const base = new Date(y, m - 1 + offset, 1);
    const first = iso(new Date(base.getFullYear(), base.getMonth(), 1));
    const last = iso(new Date(base.getFullYear(), base.getMonth() + 1, 0));
    onChange({ start: first, end: last });
    setOpen(false);
  };
  const nav = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    setYm(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
  };

  const startDow = new Date(y, m - 1, 1).getDay();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m - 1, 1 - startDow + i);
    const di = iso(d);
    const out = d.getMonth() !== m - 1;
    const dow = d.getDay();
    let cls = "vcal-d";
    if (out) cls += " out";
    else {
      if (dow === 0) cls += " sun";
      if (dow === 6) cls += " sat";
    }
    if (di === TODAY) cls += " today";
    const { start, end } = range;
    if (start && end && di > start && di < end) cls += " in-range";
    if (di === start || di === end) cls += " range-end-pt";
    cells.push(
      <button key={i} className={cls} onClick={() => pickDay(di)}>
        {d.getDate()}
      </button>,
    );
  }
  const pm = m === 1 ? 12 : m - 1;
  const nm = m === 12 ? 1 : m + 1;

  return (
    <div className="vcal-wrap">
      <button className={`vcal-field ${open ? "open" : ""}`} onClick={() => setOpen((o) => !o)} title="発生期間で絞り込み">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#5A6472" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x={3} y={4} width={18} height={18} rx={2} />
          <line x1={16} y1={2} x2={16} y2={6} />
          <line x1={8} y1={2} x2={8} y2={6} />
          <line x1={3} y1={10} x2={21} y2={10} />
        </svg>
        {hasRange ? (
          <span>
            {range.start}〜{range.end}
          </span>
        ) : (
          <span className="ph">発生期間（全期間）</span>
        )}
        {hasRange && (
          <span
            className="vcal-x"
            onClick={(e) => {
              e.stopPropagation();
              onChange({ start: null, end: null });
            }}
            title="クリア"
          >
            ×
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="vcal-backdrop" onClick={() => setOpen(false)} />
          <div className="vcal-pop" onClick={(e) => e.stopPropagation()}>
            <div className="vcal-head">
              <button className="vcal-nav" onClick={() => nav(-1)}>
                ◀前月
              </button>
              <span className="vcal-title">
                {y}年 {m}月
              </span>
              <button className="vcal-nav" onClick={() => nav(1)}>
                次月▶
              </button>
            </div>
            <div className={`vcal-hint ${hasRange ? "done" : ""}`}>
              {hasRange ? `${range.start}〜${range.end}` : "開始日か終了日を選択してください"}
            </div>
            <div className="vcal-quick">
              <button onClick={() => pickMonth(-1)}>{pm}月を選択</button>
              <button onClick={() => pickMonth(0)}>{m}月を選択</button>
              <button onClick={() => pickMonth(1)}>{nm}月を選択</button>
            </div>
            <div className="vcal-grid vcal-wds">
              {["日", "月", "火", "水", "木", "金", "土"].map((w, i) => (
                <div key={w} className={`vcal-wd ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}>
                  {w}
                </div>
              ))}
            </div>
            <div className="vcal-grid vcal-days">{cells}</div>
            <div className="vcal-foot">
              <button className="vcal-clear" onClick={() => onChange({ start: null, end: null })}>
                全期間に戻す
              </button>
              <button className="vcal-close" onClick={() => setOpen(false)}>
                閉じる
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
