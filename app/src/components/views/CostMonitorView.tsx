import { useMemo, useState } from "react";
import { useDataStore, CURRENT_USER } from "../../store/data";
import { useMasterStore } from "../../store/master";
import { useSettingsStore, currentSnapshot } from "../../store/settings";
import { nextOverlayId, useStore } from "../../store";
import { buildPlateIndex, plateRegistered } from "../../domain/match";
import { buildVehicles, type Vehicle } from "../../domain/vehicles";
import { catStyleOf } from "../../domain/catStyle";
import { yen } from "../../domain/format";
import type { ChangelogEntry } from "../../domain/types";
import { KpiCards } from "../costmonitor/KpiCards";
import { PeriodCalendar, type DateRange } from "../costmonitor/PeriodCalendar";
import { VehEditModal } from "../costmonitor/VehEditModal";
import { ChangelogPanel } from "../costmonitor/ChangelogPanel";
import { Pager } from "../common/Pager";
import { Button } from "../common/Button";
import { IconCheck, IconTruck, IconAlert } from "../common/Icon";

export function CostMonitorView() {
  const docs = useDataStore((s) => s.docs);
  const lines = useDataStore((s) => s.lines);
  const manualLines = useDataStore((s) => s.manualLines);
  const adjustments = useDataStore((s) => s.adjustments);
  const vehTrash = useDataStore((s) => s.vehTrash);
  const changelog = useDataStore((s) => s.changelog);
  const changelogSeenCount = useDataStore((s) => s.changelogSeenCount);
  const trashVehicle = useDataStore((s) => s.trashVehicle);
  const restoreVehicle = useDataStore((s) => s.restoreVehicle);
  const markChangelogSeen = useDataStore((s) => s.markChangelogSeen);
  const masters = useMasterStore((s) => s.vehicles);
  const categories = useSettingsStore((s) => currentSnapshot(s).categories);
  const defaultPageSize = useSettingsStore((s) => s.live.settings.defaultPageSize);
  const pushOverlay = useStore((s) => s.pushOverlay);
  const showToast = useStore((s) => s.showToast);

  const [office, setOffice] = useState("all");
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [trashView, setTrashView] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPageSize);
  const [clogOpen, setClogOpen] = useState(false);

  const plateIndex = useMemo(() => buildPlateIndex(masters), [masters]);
  const allVeh = useMemo(
    () =>
      buildVehicles({
        docs, lines, manualLines, adjustments, masters, plateIndex,
        catFilter: office,
        range: range.start && range.end ? { start: range.start, end: range.end } : null,
      }),
    [docs, lines, manualLines, adjustments, masters, plateIndex, office, range],
  );

  const trashCount = allVeh.filter((v) => vehTrash.has(v.key)).length;
  const visible = allVeh.filter((v) => (trashView ? vehTrash.has(v.key) : !vehTrash.has(v.key)));
  const unread = changelog.length - changelogSeenCount;
  const hasRange = !!(range.start && range.end);

  const start = (page - 1) * perPage;
  const pageVeh = visible.slice(start, start + perPage);

  const openEdit = (v: Vehicle) => {
    pushOverlay({
      id: nextOverlayId(),
      title: `コスト内訳を編集 — ${v.target}`,
      width: 720,
      render: (close) => (
        <VehEditModal vkey={v.key} kind={v.kind} target={v.target} office={office === "all" ? "" : office} onClose={close} />
      ),
    });
  };

  const confirmTrash = (v: Vehicle, mode: "trash" | "restore") => {
    pushOverlay({
      id: nextOverlayId(),
      title: mode === "trash" ? "この車両をゴミ箱へ移動しますか？" : "この車両を一覧に戻しますか？",
      width: 480,
      render: (close) => (
        <>
          <div className="m-body">
            <div className="ce-warn" style={mode === "restore" ? { background: "var(--greenSoft)", borderColor: "var(--greenLine)" } : undefined}>
              {mode === "trash" ? <IconAlert color="#B23A2E" size={18} /> : <IconCheck color="#0E7A4B" size={18} />}
              <div>
                <div className="ce-q">
                  車番 {v.target}（累計 {yen(v.total)}・明細 {v.count}件）
                </div>
                <div className="ce-note">
                  {mode === "trash"
                    ? "ゴミ箱へ移動するとコストモニターの集計から除外されます。いつでも戻せます。"
                    : "コストモニターに再表示されます。"}
                  この操作は変更履歴に記録されます。
                </div>
              </div>
            </div>
          </div>
          <div className="m-foot">
            <Button variant="cancel" onClick={close}>
              キャンセル
            </Button>
            <Button
              variant="green"
              onClick={() => {
                const entry: ChangelogEntry = {
                  ts: nowLocal(),
                  user: CURRENT_USER,
                  action: mode === "trash" ? "ゴミ箱" : "復元",
                  vehKey: v.key,
                  kind: v.kind,
                  vehTarget: v.target,
                  vehTrash: true,
                  detail:
                    mode === "trash"
                      ? `車両「${v.target}」をゴミ箱へ移動しました（累計 ${yen(v.total)}・明細 ${v.count}件）`
                      : `車両「${v.target}」をコストモニターに戻しました`,
                };
                if (mode === "trash") trashVehicle(entry);
                else restoreVehicle(entry);
                close();
                showToast(mode === "trash" ? `車番 ${v.target} をゴミ箱へ移動しました` : `車番 ${v.target} を戻しました`);
              }}
            >
              {mode === "trash" ? "ゴミ箱へ移動" : "一覧に戻す"}
            </Button>
          </div>
        </>
      ),
    });
  };

  return (
    <>
      <div className="pagehead pagehead-veh">
        <div>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--inkSoft)" }}>
            連携済みの書類から、車両（車番）ごとにコストを自動集計します。1車番＝1レコードで、常に最新の積み上げを表示します。
            {office !== "all" && <b style={{ color: "var(--greenDark)" }}>　絞り込み：{office}</b>}
            {hasRange && (
              <b style={{ color: "var(--greenDark)" }}>
                　期間：{range.start}〜{range.end}
              </b>
            )}
          </p>
        </div>
        <div className="ph-spacer" />
        <button className={`trash-toggle ${trashView ? "on" : ""}`} onClick={() => { setTrashView((t) => !t); setPage(1); }}>
          ゴミ箱<span style={{ fontFamily: "var(--mono)", fontSize: 10, background: "rgba(0,0,0,.06)", padding: "0 6px", borderRadius: 999 }}>{trashCount}</span>
        </button>
        <button className="btn-hist" onClick={() => { setClogOpen(true); markChangelogSeen(); }}>
          変更履歴{unread > 0 && <span className="bh-ct">{unread}</span>}
        </button>
      </div>

      <div className="veh-filters">
        <span className="vf-l">絞り込み</span>
        <div className="filter-sel">
          <span className="fs-l">営業所</span>
          <select value={office} onChange={(e) => { setOffice(e.target.value); setPage(1); }}>
            <option value="all">すべて</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <PeriodCalendar range={range} onChange={(r) => { setRange(r); setPage(1); }} />
      </div>

      {!trashView && visible.length > 0 && <KpiCards vehicles={visible} />}

      {visible.length === 0 ? (
        <div className="veh-card">
          <div className="empty">
            <IconTruck color="#9AA3AD" size={40} />
            <div className="et">
              {trashView ? "ゴミ箱は空です" : hasRange ? "この期間に発生したコストはありません" : "まだ連携された車両がありません"}
            </div>
            <div className="es">
              {trashView
                ? "ゴミ箱へ移動した車両はここに表示されます。"
                : hasRange
                  ? "期間を変更するか「全期間に戻す」で絞り込みを解除してください。"
                  : "書類一覧で「データ連携する」と、ここに車両ごとのコストが積み上がります。"}
            </div>
          </div>
        </div>
      ) : (
        <div className="veh-card">
          <div className="tscroll">
            <table className="vt">
              <thead>
                <tr>
                  <th>車番</th>
                  <th>マスタ</th>
                  <th>コスト内訳</th>
                  <th>最終発生 / 明細数</th>
                  <th className="r">累計コスト</th>
                  <th style={{ textAlign: "right" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {pageVeh.map((v) => {
                  const isMaster = plateRegistered(plateIndex, v.target);
                  const cats = Object.keys(v.byCat).sort((a, b) => v.byCat[b] - v.byCat[a]);
                  return (
                    <tr className="vrow" key={v.key}>
                      <td>
                        <span className="plate">{v.target}</span>
                      </td>
                      <td>
                        {isMaster ? (
                          <span className="mtag exist">
                            <IconCheck color="#157F73" size={11} />
                            既存マスタ
                          </span>
                        ) : (
                          <span className="mtag newv">
                            <IconTruck color="#B87514" size={11} />
                            新規作成
                          </span>
                        )}
                      </td>
                      <td style={{ minWidth: 200 }}>
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
                      </td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--inkSoft)" }}>
                        {v.last}
                        <div style={{ marginTop: 3 }}>{v.count}明細</div>
                      </td>
                      <td className="r total">{yen(v.total)}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {trashView ? (
                          <button className="icon-btn" title="コストモニターに戻す" onClick={() => confirmTrash(v, "restore")}>
                            ↩
                          </button>
                        ) : (
                          <>
                            <button className="veh-edit-btn" onClick={() => openEdit(v)}>
                              編集
                            </button>
                            <button className="icon-btn" title="ゴミ箱へ移動" style={{ marginLeft: 6 }} onClick={() => confirmTrash(v, "trash")}>
                              🗑
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager total={visible.length} page={page} perPage={perPage} onPage={setPage} onPerPage={(n) => { setPerPage(n); setPage(1); }} />
        </div>
      )}

      {clogOpen && <ChangelogPanel onClose={() => setClogOpen(false)} />}
    </>
  );
}

function nowLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
