import { useEffect, useState } from "react";
import type { Line } from "../../domain/types";
import { buildReflectPlan, type ReflectStep } from "../../domain/reflect";
import type { PlateIndex } from "../../domain/match";

interface Unit {
  name: string;
  lines: Line[];
}
interface PlanRow extends Partial<ReflectStep> {
  header?: boolean;
  text: string;
}

/** データ連携の処理ログ（①マスタ登録 → ②コスト書込）をアニメーション表示。 */
export function ReflectLog({
  units,
  plateIndex,
  threshold,
  doneLabel,
  onClose,
}: {
  units: Unit[];
  plateIndex: PlateIndex;
  threshold: number;
  doneLabel: string;
  onClose: () => void;
}) {
  const plan: PlanRow[] = [];
  const multi = units.length > 1;
  units.forEach((u) => {
    if (multi) plan.push({ header: true, text: u.name });
    buildReflectPlan(u.lines, plateIndex, threshold).forEach((s) => plan.push(s));
  });

  const [done, setDone] = useState(0);
  const finished = done >= plan.length;

  useEffect(() => {
    if (finished) return;
    const delay = plan.length > 16 ? 170 : 380;
    const t = setTimeout(() => setDone((d) => d + 1), delay);
    return () => clearTimeout(t);
  }, [done, finished, plan.length]);

  return (
    <div className="ovl">
      <div className="log-modal">
        <div className="mh">
          <span>データ連携ログ</span>
          <span className="order">① マスタ登録 → ② コスト書込</span>
        </div>
        <div className="log">
          {plan.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,.6)" }}>書き込む明細がありません</div>
          ) : (
            plan.map((l, i) => {
              const stt = i < done ? "ok" : i === done ? "run" : "wait";
              if (l.header) {
                return (
                  <div key={i} className={`logline ${stt === "wait" ? "wait" : ""}`}>
                    <span className="mk2" />
                    <div>{l.text}</div>
                  </div>
                );
              }
              const tag = l.phase === 1 ? <span className="tag1">[STEP1]</span> : l.phase === 2 ? <span className="tag2">[STEP2]</span> : null;
              return (
                <div key={i} className={`logline ${stt === "wait" ? "wait" : ""}`}>
                  <span className="mk2">{stt === "ok" ? "✓" : stt === "run" ? "…" : "·"}</span>
                  <div>
                    <div>
                      {tag}
                      {l.text}
                    </div>
                    {stt === "ok" && l.ok && <div className="okline">{l.ok}</div>}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="mf">
          {finished ? (
            <>
              <span>✓ {doneLabel}</span>
              <button className="btn-green" style={{ marginLeft: "auto" }} onClick={onClose}>
                閉じる
              </button>
            </>
          ) : (
            <span style={{ color: "rgba(255,255,255,.7)", fontWeight: 400 }}>
              書き込み中… {Math.min(done, plan.length)}/{plan.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
