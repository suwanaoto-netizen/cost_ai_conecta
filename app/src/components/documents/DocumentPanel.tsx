import { useEffect, useMemo, useState } from "react";
import { useDataStore } from "../../store/data";
import { useMasterStore } from "../../store/master";
import { useSettingsStore } from "../../store/settings";
import { useStore } from "../../store";
import type { DocType, Document, Line } from "../../domain/types";
import { buildPlateIndex, matchOf, resolveVehicleId } from "../../domain/match";
import { docTotal, expectedDocTypes, ocrAmountCandidates, plateSuggestions } from "../../domain/documents";
import { DOC_TYPES } from "../../domain/settings";
import { yen } from "../../domain/format";
import { MatchBadge } from "../common/MatchBadge";
import { StatusChip } from "../common/StatusChip";
import { Button } from "../common/Button";
import { IconCheck, IconX, IconChevron, IconAlert } from "../common/Icon";
import { ReflectLog } from "./ReflectLog";
import { InvoicePreview } from "./InvoicePreview";

type DraftLine = Pick<Line, "lid" | "item" | "plate" | "kind" | "cat" | "inspectedAt" | "amount" | "confidence" | "vehicleId">;
interface Draft {
  id: string;
  no: number;
  name: string;
  vendor: string;
  cat: DocType;
  category: string;
  status: Document["status"];
  reflectedAt: string | null;
  lines: DraftLine[];
}

export function DocumentPanel({
  docId,
  ordered,
  onNavigate,
  onClose,
}: {
  docId: string;
  ordered: Document[];
  onNavigate: (id: string) => void;
  onClose: () => void;
}) {
  const docs = useDataStore((s) => s.docs);
  const lines = useDataStore((s) => s.lines);
  const saveDocDraft = useDataStore((s) => s.saveDocDraft);
  const reflectDocDraft = useDataStore((s) => s.reflectDocDraft);
  const masters = useMasterStore((s) => s.vehicles);
  const settings = useSettingsStore((s) => s.live.settings);
  const catDocTypes = useSettingsStore((s) => s.live.catDocTypes);
  const cats = useSettingsStore((s) => s.live.cats);
  const categories = useSettingsStore((s) => s.live.categories);
  const showToast = useStore((s) => s.showToast);
  const setView = useStore((s) => s.setView);

  const plateIndex = useMemo(() => buildPlateIndex(masters), [masters]);
  const masterPlates = useMemo(() => masters.map((m) => m.plate), [masters]);
  const threshold = settings.matchThreshold;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [zoom, setZoom] = useState(100);
  const [reflecting, setReflecting] = useState(false);
  const [confirmReflect, setConfirmReflect] = useState(false);
  const [deleteLid, setDeleteLid] = useState<number | null>(null);

  useEffect(() => {
    const d = docs.find((x) => x.id === docId);
    if (!d) return;
    const dl: DraftLine[] = lines
      .filter((l) => l.docId === docId)
      .map((l) => ({ lid: l.lid, item: l.item, plate: l.plate, kind: l.kind, cat: l.cat, inspectedAt: l.inspectedAt, amount: l.amount, confidence: l.confidence, vehicleId: l.vehicleId }));
    setDraft({ id: d.id, no: d.no, name: d.name, vendor: d.vendor, cat: d.cat, category: d.category, status: d.status, reflectedAt: d.reflectedAt, lines: dl });
    setZoom(100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  if (!draft) return null;
  const ro = draft.status === "連携済み";
  const idx = ordered.findIndex((d) => d.id === docId);
  const total = docTotal(draft.lines as Line[]);
  const ocrCand = ocrAmountCandidates(draft.lines as Line[]);
  const exp = expectedDocTypes(draft.lines as Line[], catDocTypes);

  const patchLine = (lid: number, patch: Partial<DraftLine>) =>
    setDraft((d) => (d ? { ...d, lines: d.lines.map((l) => (l.lid === lid ? { ...l, ...patch } : l)) } : d));
  const setPlate = (lid: number, plate: string) =>
    patchLine(lid, { plate, confidence: 0.99, vehicleId: resolveVehicleId(plateIndex, plate) });

  const save = () => {
    saveDocDraft(draft.id, { vendor: draft.vendor, cat: draft.cat, category: draft.category }, draft.lines as Line[]);
    setDraft((d) => (d ? { ...d, status: d.status === "未入力" ? "入力済み" : d.status } : d));
    showToast("入力済みにしました");
  };

  const doReflect = () => {
    reflectDocDraft(draft.id, { vendor: draft.vendor, cat: draft.cat, category: draft.category }, draft.lines as Line[]);
    setReflecting(false);
    onClose();
    showToast("車両コストへデータ連携しました", { label: "コストモニターを見る", fn: () => setView("vehicles") });
  };

  const s2 = draft.status === "未入力" ? "current" : "done";
  const s3 = draft.status === "連携済み" ? "done" : draft.status === "入力済み" ? "current" : "todo";

  return (
    <>
      <div className="panel-ovl" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="panel" role="dialog" aria-modal="true" aria-label={`書類 No.${draft.no}`}>
          <div className="pn-head">
            <div className="pn-no">
              No. <b>{draft.no}</b>
            </div>
            <StatusChip status={draft.status} />
            <div className="pn-nav">
              <button className="pn-navbtn" disabled={idx <= 0} onClick={() => idx > 0 && onNavigate(ordered[idx - 1].id)}>
                <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
                  <IconChevron size={13} />
                </span>
                前へ
              </button>
              <span className="pn-navpos">
                {idx + 1} / {ordered.length}
              </span>
              <button className="pn-navbtn" disabled={idx < 0 || idx >= ordered.length - 1} onClick={() => onNavigate(ordered[idx + 1].id)}>
                次へ
                <IconChevron size={13} />
              </button>
            </div>
            <div className="pn-actions">
              {draft.status === "未入力" && (
                <span className="reflect-hint">
                  <IconAlert color="#B87514" size={12} /> 入力済みにすると連携できます
                </span>
              )}
              {!ro && (
                <Button variant="ghost" onClick={save}>
                  <IconCheck color="#5A6472" size={14} /> 入力済み
                </Button>
              )}
              {ro ? (
                <span className="badge" style={{ color: "var(--greenDark)", background: "var(--greenSoft)" }}>
                  <IconCheck color="#0E7A4B" size={12} />
                  連携済み（{draft.reflectedAt || ""}）
                </span>
              ) : (
                <Button variant="green" disabled={draft.status !== "入力済み"} onClick={() => setConfirmReflect(true)}>
                  データ連携する
                </Button>
              )}
              <button className="icon-btn" style={{ borderColor: "var(--line)" }} title="閉じる" onClick={onClose}>
                <IconX size={16} />
              </button>
            </div>
          </div>

          <div className="pn-body">
            <div className="pn-left">
              <div className="stepper">
                <div className="step done">
                  <span className="sdot">
                    <IconCheck color="#fff" size={11} />
                  </span>
                  <span className="slab">取込・データ化</span>
                </div>
                <div className="sline done" />
                <div className={`step ${s2}`}>
                  <span className="sdot">{s2 === "done" ? <IconCheck color="#fff" size={11} /> : "2"}</span>
                  <span className="slab">入力済みにする</span>
                </div>
                <div className={`sline ${draft.status !== "未入力" ? "done" : ""}`} />
                <div className={`step ${s3}`}>
                  <span className="sdot">{s3 === "done" ? <IconCheck color="#fff" size={11} /> : "3"}</span>
                  <span className="slab">データ連携</span>
                </div>
              </div>

              <div className="pn-sec">書類情報</div>
              <div className="fld">
                <label>書類名</label>
                <input className="in" value={draft.name} readOnly />
              </div>
              <div className="grid2">
                <div className="fld">
                  <label>営業所</label>
                  <select className="in" disabled={ro} value={draft.category} onChange={(e) => setDraft((d) => (d ? { ...d, category: e.target.value } : d))}>
                    <option value="">（未選択）</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld">
                  <label>取引先</label>
                  <input className="in" readOnly={ro} value={draft.vendor} onChange={(e) => setDraft((d) => (d ? { ...d, vendor: e.target.value } : d))} />
                </div>
              </div>
              <div className="fld">
                <label>
                  書類タイプ {exp.length > 0 && <span className="exp-hint">想定：{exp.join("・")}</span>}
                </label>
                <select className="in" disabled={ro} value={draft.cat} onChange={(e) => setDraft((d) => (d ? { ...d, cat: e.target.value as DocType } : d))}>
                  {DOC_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="total-box">
                <span className="lab">書類合計（明細 {draft.lines.length}件）</span>
                <span className="v">{yen(total)}</span>
              </div>

              <div className="pn-sec">
                明細 <span className="ct">{draft.lines.length}件</span>
              </div>
              <div className="legend">
                右の書類の読み取り箇所と対応：
                <span className="lg lg-g">項目</span>
                <span className="lg lg-r">対象車両</span>
                <span className="lg lg-b">金額</span>
              </div>

              {draft.lines.map((l, i) => {
                const sugg = !ro ? plateSuggestions(l.plate, masterPlates) : [];
                return (
                  <div className="line-card" key={l.lid}>
                    <div className="lc-head">
                      <span className="lc-no">明細 {i + 1}</span>
                      <span className="match-badge">
                        <MatchBadge state={matchOf(l, plateIndex, threshold)} />
                      </span>
                      {!ro && (
                        <button className="lc-del" title="この明細を削除" onClick={() => setDeleteLid(l.lid)}>
                          <IconX color="#B23A2E" size={15} />
                        </button>
                      )}
                    </div>
                    <div className="fld">
                      <label>項目</label>
                      <input className="in b-g" readOnly={ro} value={l.item} onChange={(e) => patchLine(l.lid, { item: e.target.value })} />
                    </div>
                    <div className="grid2">
                      <div className="fld">
                        <label>コスト分類</label>
                        <select className="in" disabled={ro} value={l.cat} onChange={(e) => patchLine(l.lid, { cat: e.target.value })}>
                          {cats.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="fld">
                        <label>発生日</label>
                        <input className="in mono" readOnly={ro} value={l.inspectedAt} onChange={(e) => patchLine(l.lid, { inspectedAt: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid2">
                      <div className="fld">
                        <label>対象車両（車番）</label>
                        <div className="sug-combo">
                          <input className="in mono b-r" readOnly={ro} value={l.plate} placeholder="（対象なし）" autoComplete="off" onChange={(e) => setPlate(l.lid, e.target.value)} />
                          {!ro && (
                            <div className="sug-pop">
                              <div className="sug-opt none" onMouseDown={() => setPlate(l.lid, "")}>
                                対象なし
                              </div>
                              {sugg.map((p) => (
                                <div className="sug-opt" key={p} onMouseDown={() => setPlate(l.lid, p)}>
                                  {p}
                                </div>
                              ))}
                              {sugg.length === 0 && l.plate.trim().length >= 2 && <div className="sug-empty">一致する登録車番がありません</div>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="fld">
                        <label>金額（税抜）</label>
                        <div className="amt-combo">
                          <input
                            className="in mono b-b"
                            readOnly={ro}
                            value={(+l.amount).toLocaleString("ja-JP")}
                            autoComplete="off"
                            onChange={(e) => patchLine(l.lid, { amount: parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0 })}
                          />
                          {ocrCand.includes(+l.amount) && (
                            <span className="amt-ck">
                              <IconCheck color="#16A571" size={15} />
                            </span>
                          )}
                          {!ro && ocrCand.length > 0 && (
                            <div className="amt-pop">
                              <div className="amt-pop-h">ファイルから読み取られた金額の一覧</div>
                              {ocrCand.map((a) => (
                                <div className={`amt-opt ${a === +l.amount ? "sel" : ""}`} key={a} onMouseDown={() => patchLine(l.lid, { amount: a })}>
                                  {a.toLocaleString("ja-JP")}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="pn-foot-note">
                <IconAlert color="#B87514" size={16} />
                <span>
                  対象車両が登録済みかは上のバッジで自動判定しています（既存／新規／要確認）。<b>「データ連携する」</b>と、新規車両はマスタ作成、既存車両はコストを積み上げます。
                </span>
              </div>
            </div>

            <div className="pn-right">
              <div className="pv-toolbar">
                <span className="fn">{draft.name}</span>
                <button onClick={() => setZoom((z) => Math.max(50, z - 10))}>−</button>
                <span>{zoom}%</span>
                <button onClick={() => setZoom((z) => Math.min(200, z + 10))}>＋</button>
              </div>
              <div className="pv-page-wrap">
                <InvoicePreview no={draft.no} vendor={draft.vendor} lines={draft.lines as Line[]} companyName={settings.companyName} zoom={zoom} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmReflect && (
        <div className="ovl" onMouseDown={(e) => e.target === e.currentTarget && setConfirmReflect(false)}>
          <div className="modal" style={{ width: "min(480px,100%)" }}>
            <div className="m-head">
              <span className="t">データ連携しますか？</span>
              <button className="x" onClick={() => setConfirmReflect(false)}>
                <IconX />
              </button>
            </div>
            <div className="m-body">
              <p style={{ margin: "0 0 13px", fontSize: 13.5 }}>「{draft.name}」を車両コストへデータ連携します。</p>
              <div className="ce-warn">
                <IconAlert color="#B87514" size={18} />
                <div>
                  <div className="ce-q">データ連携すると、書類一覧では修正できなくなります。</div>
                  <div className="ce-note">修正が必要な場合は、データ連携後はコストモニターから内訳を編集できます。</div>
                </div>
              </div>
            </div>
            <div className="m-foot">
              <Button variant="cancel" onClick={() => setConfirmReflect(false)}>
                キャンセル
              </Button>
              <Button
                variant="green"
                onClick={() => {
                  setConfirmReflect(false);
                  setReflecting(true);
                }}
              >
                データ連携する
              </Button>
            </div>
          </div>
        </div>
      )}

      {reflecting && (
        <ReflectLog
          units={[{ name: draft.name, lines: draft.lines as Line[] }]}
          plateIndex={plateIndex}
          threshold={threshold}
          doneLabel={`${draft.name} をデータ連携しました`}
          onClose={doReflect}
        />
      )}

      {deleteLid != null && (
        <div className="ovl" onMouseDown={(e) => e.target === e.currentTarget && setDeleteLid(null)}>
          <div className="modal" style={{ width: "min(460px,100%)" }}>
            <div className="m-head">
              <span className="t">この明細を削除しますか？</span>
              <button className="x" onClick={() => setDeleteLid(null)}>
                <IconX />
              </button>
            </div>
            <div className="m-body">
              <div className="ce-warn" style={{ background: "var(--alertSoft)", borderColor: "#E0B8B2" }}>
                <IconAlert color="#B23A2E" size={18} />
                <div>
                  <div className="ce-q">この明細を削除します。</div>
                  <div className="ce-note">保存または連携で確定します。</div>
                </div>
              </div>
            </div>
            <div className="m-foot">
              <Button variant="cancel" onClick={() => setDeleteLid(null)}>
                キャンセル
              </Button>
              <Button
                variant="green"
                onClick={() => {
                  setDraft((d) => (d ? { ...d, lines: d.lines.filter((x) => x.lid !== deleteLid) } : d));
                  setDeleteLid(null);
                  showToast("明細を削除しました（保存または連携で確定します）");
                }}
              >
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
