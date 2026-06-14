import { useMemo, useState, type ReactNode } from "react";
import { useDataStore } from "../../store/data";
import { useMasterStore } from "../../store/master";
import { useSettingsStore } from "../../store/settings";
import { useStore } from "../../store";
import type { Line } from "../../domain/types";
import { buildPlateIndex, countUnresolved } from "../../domain/match";
import { docDate, docTotal } from "../../domain/documents";
import { yen } from "../../domain/format";
import { StatusChip } from "../common/StatusChip";
import { Pager } from "../common/Pager";
import { Button } from "../common/Button";
import { IconAlert, IconCheck, IconX } from "../common/Icon";
import { DocumentPanel } from "../documents/DocumentPanel";
import { UploadModal } from "../documents/UploadModal";
import { ReflectLog } from "../documents/ReflectLog";

type StatusFilter = "all" | "未入力" | "入力済み" | "連携済み";

export function DocumentsView() {
  const docs = useDataStore((s) => s.docs);
  const lines = useDataStore((s) => s.lines);
  const markEntered = useDataStore((s) => s.markEntered);
  const reflectMany = useDataStore((s) => s.reflectMany);
  const changeOffice = useDataStore((s) => s.changeOffice);
  const setDeleted = useDataStore((s) => s.setDeleted);
  const masters = useMasterStore((s) => s.vehicles);
  const categories = useSettingsStore((s) => s.live.categories);
  const threshold = useSettingsStore((s) => s.live.settings.matchThreshold);
  const defaultPageSize = useSettingsStore((s) => s.live.settings.defaultPageSize);
  const showToast = useStore((s) => s.showToast);

  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [office, setOffice] = useState("all");
  const [q, setQ] = useState("");
  const [trash, setTrash] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMenu, setBulkMenu] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPageSize);
  const [panelId, setPanelId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [enterConfirm, setEnterConfirm] = useState<number | null>(null);
  const [officeConfirm, setOfficeConfirm] = useState<{ ids: string[]; office: string } | null>(null);
  const [trashConfirm, setTrashConfirm] = useState<{ ids: string[]; mode: "trash" | "restore" } | null>(null);
  const [reflectConfirm, setReflectConfirm] = useState<{ ids: string[]; warn: number } | null>(null);
  const [reflectingIds, setReflectingIds] = useState<string[] | null>(null);

  const plateIndex = useMemo(() => buildPlateIndex(masters), [masters]);
  const linesOf = (id: string): Line[] => lines.filter((l) => l.docId === id);

  const counts = { all: 0, 未入力: 0, 入力済み: 0, 連携済み: 0 } as Record<string, number>;
  docs.filter((d) => !d.deleted).forEach((d) => { counts.all++; counts[d.status]++; });
  const trashCount = docs.filter((d) => d.deleted).length;

  const visible = useMemo(() => {
    let list = docs.filter((d) => d.deleted === trash);
    if (!trash && filterStatus !== "all") list = list.filter((d) => d.status === filterStatus);
    if (office !== "all") list = list.filter((d) => (d.category || "") === office);
    if (q.trim()) {
      const ql = q.trim().toLowerCase();
      list = list.filter((d) => (d.vendor + d.name + (d.category || "")).toLowerCase().includes(ql));
    }
    return list.slice().sort((a, b) => b.no - a.no);
  }, [docs, trash, filterStatus, office, q]);

  const start = (page - 1) * perPage;
  const slice = visible.slice(start, start + perPage);
  const sel = visible.filter((d) => selected.has(d.id));

  const resetSelection = () => { setSelected(new Set()); setBulkMenu(false); };
  const onFilterChange = (fn: () => void) => { fn(); resetSelection(); setPage(1); };
  const toggleSelect = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => {
    const allSel = slice.length > 0 && slice.every((d) => selected.has(d.id));
    setSelected((s) => { const n = new Set(s); slice.forEach((d) => (allSel ? n.delete(d.id) : n.add(d.id))); return n; });
  };

  const enterable = sel.filter((d) => d.status === "未入力");
  const reflectable = sel.filter((d) => d.status === "入力済み");
  const officeable = sel.filter((d) => d.status !== "連携済み");

  return (
    <>
      <div className="pagehead">
        <Button variant="green" onClick={() => setUploadOpen(true)}>
          ＋ 新規アップロード
        </Button>
        <p className="page-desc" style={{ margin: 0, color: "var(--inkSoft)", fontSize: 12.5 }}>
          請求書をアップロード → 行をクリックして内容を確認・営業所を選択 → データ連携、の流れで進みます。複数選択でまとめて処理できます。
        </p>
      </div>

      <div className="toolbar">
        {!trash && (
          <div className="seg">
            {(["all", "未入力", "入力済み", "連携済み"] as StatusFilter[]).map((k) => (
              <button key={k} className={filterStatus === k ? "active" : ""} onClick={() => onFilterChange(() => setFilterStatus(k))}>
                {k === "all" ? "すべて" : k}
                <span className="n">{counts[k]}</span>
              </button>
            ))}
          </div>
        )}
        <div className="filter-sel">
          <span className="fs-l">営業所</span>
          <select value={office} onChange={(e) => onFilterChange(() => setOffice(e.target.value))}>
            <option value="all">すべて</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="srch">
          <input placeholder="取引先・書類名で検索" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <div className="tb-spacer" />
        <button className={`trash-toggle ${trash ? "on" : ""}`} onClick={() => onFilterChange(() => { setTrash((t) => !t); setFilterStatus("all"); })}>
          ゴミ箱<span style={{ fontFamily: "var(--mono)", fontSize: 10, background: "rgba(0,0,0,.06)", padding: "0 6px", borderRadius: 999 }}>{trashCount}</span>
        </button>
      </div>

      {!trash && sel.length >= 2 ? (
        <div className="bulkbar">
          <span className="bb-count">{sel.length}件を選択中</span>
          <button className="bb-clear" onClick={resetSelection}>選択を解除</button>
          <div className="bulk-dd">
            <button className="bulk-btn" onClick={() => setBulkMenu((b) => !b)}>一括処理 ▾</button>
            {bulkMenu && (
              <>
                <div className="bulk-scrim" onClick={() => setBulkMenu(false)} />
                <div className="bulk-menu">
                  <button disabled={!enterable.length} onClick={() => { setBulkMenu(false); setEnterConfirm(enterable.length); }}>
                    <span className="lab"><IconCheck color={enterable.length ? "#0E7A4B" : "#9AA3AD"} size={14} /> 入力済みにする</span>
                    <span className="mc">未入力 {enterable.length}件</span>
                  </button>
                  <button disabled={!reflectable.length} onClick={() => { setBulkMenu(false); setReflectConfirm({ ids: reflectable.map((d) => d.id), warn: reflectable.reduce((n, d) => n + countUnresolved(linesOf(d.id), plateIndex, threshold), 0) }); }}>
                    <span className="lab">↗ データ連携する</span>
                    <span className="mc">入力済み {reflectable.length}件</span>
                  </button>
                  <button disabled={!officeable.length} onClick={() => { setBulkMenu(false); setOfficeConfirm({ ids: officeable.map((d) => d.id), office: categories[0] ?? "" }); }}>
                    <span className="lab">▣ 営業所を変更</span>
                    <span className="mc">選択 {officeable.length}件</span>
                  </button>
                  <button className="danger" onClick={() => { setBulkMenu(false); setTrashConfirm({ ids: sel.map((d) => d.id), mode: "trash" }); }}>
                    <span className="lab">🗑 ゴミ箱へ移動</span>
                    <span className="mc">選択 {sel.length}件</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="count-line">
          {trash ? "ゴミ箱" : "表示中"} <b>{visible.length}</b> 件
          {!trash && sel.length === 1 && <span className="sel-hint">1件選択中（2件以上で一括処理）</span>}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="twrap">
          <div className="empty">
            <div className="et">{trash ? "ゴミ箱は空です" : "該当する書類がありません"}</div>
            <div className="es">{trash ? "削除した書類はここに移動します。" : "右上の「新規アップロード」から請求書を取り込んでください。"}</div>
          </div>
        </div>
      ) : (
        <div className="twrap">
          <div className="tscroll">
            <table className="dt">
              <thead>
                <tr>
                  {!trash && (
                    <th className="c">
                      <input
                        type="checkbox"
                        checked={slice.length > 0 && slice.every((d) => selected.has(d.id))}
                        ref={(el) => { if (el) el.indeterminate = sel.length > 0 && !slice.every((d) => selected.has(d.id)); }}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th>No</th>
                  <th>ステータス</th>
                  <th>区分・書類名</th>
                  <th>営業所</th>
                  <th>取引先</th>
                  <th>取引日</th>
                  <th>明細</th>
                  <th className="r">金額（税抜）</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slice.map((d) => {
                  const dl = linesOf(d.id);
                  const isSel = selected.has(d.id);
                  return (
                    <tr key={d.id} className={!trash && isSel ? "sel" : ""} onClick={() => setPanelId(d.id)}>
                      {!trash && (
                        <td className="c" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleSelect(d.id)} />
                        </td>
                      )}
                      <td className="no">{d.no}</td>
                      <td>{trash ? <span className="st st-deleted"><span className="dot" />削除済み</span> : <StatusChip status={d.status} />}</td>
                      <td>
                        <div className="docname">
                          <span className="nm" title={d.name}>{d.name}</span>
                        </div>
                      </td>
                      <td>{d.category ? <span className="office-chip">{d.category}</span> : <span className="office-none">未分類</span>}</td>
                      <td>{d.vendor}</td>
                      <td className="date">{docDate(dl)}</td>
                      <td className="lc">{dl.length} 件</td>
                      <td className="r">{yen(docTotal(dl))}</td>
                      <td>
                        <div className="rowact" onClick={(e) => e.stopPropagation()}>
                          {trash ? (
                            <button className="icon-btn restore" title="元に戻す" onClick={() => { setDeleted([d.id], false); showToast("書類を元に戻しました"); }}>↩</button>
                          ) : (
                            <button className="icon-btn" title="ゴミ箱へ移動" onClick={() => setTrashConfirm({ ids: [d.id], mode: "trash" })}>🗑</button>
                          )}
                        </div>
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

      {panelId && (
        <DocumentPanel
          docId={panelId}
          ordered={visible}
          onNavigate={(id) => setPanelId(id)}
          onClose={() => setPanelId(null)}
        />
      )}

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onDone={(count) => { setUploadOpen(false); onFilterChange(() => { setTrash(false); setFilterStatus("all"); setOffice("all"); }); showToast(`${count}件の書類をデータ化しました（ステータス：未入力）`); }}
        />
      )}

      {/* 一括：入力済み確認 */}
      {enterConfirm != null && (
        <ConfirmModal
          title="入力済みにしますか？"
          body={<p style={{ margin: 0, fontSize: 13.5 }}>選択中の <b>{enterConfirm}</b> 件を入力済みにします。データ連携できるようになります。</p>}
          confirmLabel="入力済みにする"
          onCancel={() => setEnterConfirm(null)}
          onConfirm={() => { markEntered(enterable.map((d) => d.id)); const n = enterable.length; setEnterConfirm(null); resetSelection(); showToast(`${n}件を入力済みにしました`); }}
        />
      )}

      {/* 一括：営業所変更 */}
      {officeConfirm && (
        <ConfirmModal
          title="営業所を変更"
          body={
            <>
              <p style={{ margin: "0 0 10px", fontSize: 13.5 }}>選択中の <b>{officeConfirm.ids.length}</b> 件の営業所を変更します（連携済みは対象外）。</p>
              <select className="in" value={officeConfirm.office} onChange={(e) => setOfficeConfirm({ ...officeConfirm, office: e.target.value })}>
                <option value="">（未選択）</option>
                {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </>
          }
          confirmLabel="変更する"
          onCancel={() => setOfficeConfirm(null)}
          onConfirm={() => { changeOffice(officeConfirm.ids, officeConfirm.office); const n = officeConfirm.ids.length; const o = officeConfirm.office; setOfficeConfirm(null); resetSelection(); showToast(o ? `${n}件の営業所を「${o}」に変更しました` : `${n}件を未分類にしました`); }}
        />
      )}

      {/* 一括／単一：ゴミ箱 */}
      {trashConfirm && (
        <ConfirmModal
          title="ゴミ箱へ移動しますか？"
          danger
          body={<p style={{ margin: 0, fontSize: 13.5 }}>選択した <b>{trashConfirm.ids.length}</b> 件をゴミ箱へ移動します。いつでも元に戻せます。</p>}
          confirmLabel="ゴミ箱へ移動"
          onCancel={() => setTrashConfirm(null)}
          onConfirm={() => { setDeleted(trashConfirm.ids, true); const n = trashConfirm.ids.length; setTrashConfirm(null); resetSelection(); showToast(`${n}件をゴミ箱へ移動しました`); }}
        />
      )}

      {/* 一括：データ連携 確認 */}
      {reflectConfirm && (
        <ConfirmModal
          title="データ連携しますか？"
          body={
            <>
              <p style={{ margin: "0 0 10px", fontSize: 13.5 }}>選択中の <b>{reflectConfirm.ids.length}</b> 件を車両コストへデータ連携します。</p>
              {reflectConfirm.warn > 0 && (
                <div className="ce-warn" style={{ background: "var(--alertSoft)", borderColor: "var(--alert)" }}>
                  <IconAlert color="#B23A2E" size={18} />
                  <div>
                    <div className="ce-q" style={{ color: "var(--alert)" }}>読み取り信頼度が低い明細が {reflectConfirm.warn} 件あります。</div>
                    <div className="ce-note">先に明細を確認することを推奨します。</div>
                  </div>
                </div>
              )}
            </>
          }
          confirmLabel="データ連携する"
          onCancel={() => setReflectConfirm(null)}
          onConfirm={() => { setReflectingIds(reflectConfirm.ids); setReflectConfirm(null); }}
        />
      )}

      {reflectingIds && (
        <ReflectLog
          units={reflectingIds.map((id) => ({ name: docs.find((d) => d.id === id)?.name ?? "", lines: linesOf(id) }))}
          plateIndex={plateIndex}
          threshold={threshold}
          doneLabel={`${reflectingIds.length}件の書類をデータ連携しました`}
          onClose={() => { const n = reflectingIds.length; reflectMany(reflectingIds); setReflectingIds(null); resetSelection(); showToast(`${n}件を車両コストへデータ連携しました`); }}
        />
      )}
    </>
  );
}

function ConfirmModal({
  title, body, confirmLabel, danger, onCancel, onConfirm,
}: {
  title: string; body: ReactNode; confirmLabel: string; danger?: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="ovl" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ width: "min(480px,100%)" }}>
        <div className="m-head">
          <span className="t">{title}</span>
          <button className="x" onClick={onCancel}><IconX /></button>
        </div>
        <div className="m-body">{body}</div>
        <div className="m-foot">
          <Button variant="cancel" onClick={onCancel}>キャンセル</Button>
          <Button variant={danger ? "cancel" : "green"} onClick={onConfirm} style={danger ? { color: "#fff", background: "var(--alert)", borderColor: "var(--alert)" } : undefined}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
