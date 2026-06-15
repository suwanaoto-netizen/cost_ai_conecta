import type { Vehicle } from "../../domain/vehicles";
import { catStyleOf } from "../../domain/catStyle";
import { yen } from "../../domain/format";
import { Button } from "../common/Button";
import { IconCheck, IconTruck } from "../common/Icon";

/** 車両カルテ（読み取り専用の詳細表示）。コスト内訳と発生明細のタイムラインを表示する。 */
export function VehKarteModal({ vehicle, isMaster, onClose }: { vehicle: Vehicle; isMaster: boolean; onClose: () => void }) {
  const v = vehicle;
  const cats = Object.keys(v.byCat).sort((a, b) => v.byCat[b] - v.byCat[a]);
  const events = [...v.lines].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <>
      <div className="m-body">
        <div className="vk-top">
          <span className="plate">{v.target}</span>
          {isMaster ? (
            <span className="mtag exist"><IconCheck color="#157F73" size={11} />既存マスタ</span>
          ) : (
            <span className="mtag newv"><IconTruck color="#B87514" size={11} />新規作成</span>
          )}
        </div>

        <div className="vk-stats">
          <div className="vk-stat"><div className="vk-l">累計コスト</div><div className="vk-v">{yen(v.total)}</div></div>
          <div className="vk-stat"><div className="vk-l">明細数</div><div className="vk-v">{v.count}<small>件</small></div></div>
          <div className="vk-stat"><div className="vk-l">最終発生</div><div className="vk-v mono">{v.last || "—"}</div></div>
        </div>

        <div className="vk-sec-h">コスト内訳</div>
        {v.total > 0 ? (
          <>
            <div className="bar">
              {cats.map((c) => (
                <span key={c} style={{ width: `${((v.byCat[c] / v.total) * 100).toFixed(1)}%`, background: catStyleOf(c).fg }} />
              ))}
            </div>
            <div className="breakdown">
              {cats.map((c) => (
                <span className="bd" key={c}>
                  <span className="sw" style={{ background: catStyleOf(c).fg }} />
                  {c} {yen(v.byCat[c])}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="vk-empty">コストデータがありません。</div>
        )}

        <div className="vk-sec-h">発生明細（{events.length}件）</div>
        <div className="vk-tl">
          {events.length === 0 ? (
            <div className="vk-empty">明細がありません。</div>
          ) : (
            events.map((e, i) => (
              <div className="vk-item" key={i}>
                <div className="vk-d mono">{e.date}</div>
                <div className="vk-row">
                  <span className="vk-it">{e.item}</span>
                  <span className="vk-pill" style={{ background: catStyleOf(e.cat).bg, color: catStyleOf(e.cat).fg }}>{e.cat}</span>
                  <span className="vk-amt">{yen(e.amount)}</span>
                </div>
                <div className="vk-meta">
                  <span className={`vk-tag ${e.src === "manual" ? "m" : ""}`}>{e.src === "manual" ? "手動追加" : "請求書より自動記録"}</span>
                  {e.vendor ? <span className="vk-vendor">{e.vendor}</span> : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="m-foot">
        <Button variant="cancel" onClick={onClose}>閉じる</Button>
      </div>
    </>
  );
}
