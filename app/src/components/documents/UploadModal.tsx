import { useEffect, useRef, useState } from "react";
import { useDataStore, type UploadEntry } from "../../store/data";
import { useSettingsStore } from "../../store/settings";
import type { Document } from "../../domain/types";
import { makeUploadEntry, sampleBatch } from "../../domain/uploadGen";
import { buildSplitPages, splitGroups, type SplitPage } from "../../domain/splitDemo";
import { Button } from "../common/Button";
import { Switch } from "../common/Switch";
import { IconX } from "../common/Icon";
import { SplitSettingsModal } from "./SplitSettingsModal";

type Tab = "new" | "split";

type DupItem = { idx: number; name: string; doc: Document };
type DupAlert = { items: DupItem[]; checked: Record<number, boolean> };

export function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: (count: number) => void }) {
  const addDocuments = useDataStore((s) => s.addDocuments);
  const documents = useDataStore((s) => s.documents);
  const defaultOcr = useSettingsStore((s) => s.live.settings.defaultOcr);
  const categories = useSettingsStore((s) => s.live.categories);

  const [tab, setTab] = useState<Tab>("new");
  const [ocr, setOcr] = useState(defaultOcr);
  const [category, setCategory] = useState(categories[0] ?? "");
  const [progress, setProgress] = useState<number | null>(null);
  // new tab
  const [files, setFiles] = useState<UploadEntry[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  // split tab
  const [method, setMethod] = useState<"pdf" | "zip">("pdf");
  const [splitFile, setSplitFile] = useState<string | null>(null);
  const [split, setSplit] = useState(false);
  const [pages, setPages] = useState<SplitPage[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 重複アラート（同一書類名を自動検知。含める書類をチェックで選択）
  const [dupAlert, setDupAlert] = useState<DupAlert | null>(null);

  // 進捗アニメーション → 完了で確定
  useEffect(() => {
    if (progress == null) return;
    if (progress >= 100) {
      const t = setTimeout(() => {
        const entries = tab === "new" ? files : buildSplitEntries();
        addDocuments(entries, ocr, category);
        onDone(entries.length);
      }, 360);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setProgress((p) => Math.min(100, (p ?? 0) + 5 + Math.random() * 6)), 170);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const proc = progress != null;

  const buildSplitEntries = (): UploadEntry[] => {
    const base = (splitFile ?? "無題.pdf").replace(/\.pdf$/i, "");
    const groups = split && pages ? splitGroups(pages).filter((g) => g.some((p) => p.include)) : [null];
    return groups.map((_, gi) => makeUploadEntry(base + (groups.length > 1 ? `（${gi + 1}）.pdf` : ".pdf")));
  };

  const loadDemoSplit = () => {
    setSplitFile("デモ用 結合PDF.pdf");
    setPages(buildSplitPages());
  };
  const toggleSplit = () => {
    if (!splitFile) return;
    const next = !split;
    setSplit(next);
    if (next) {
      if (!pages) setPages(buildSplitPages());
      setSettingsOpen(true);
    } else setSettingsOpen(false);
  };

  const canUpload = tab === "new" ? files.length > 0 : !!splitFile;

  // 既存書類（ゴミ箱を除く）と書類名が完全一致するものを重複とみなす。
  const findDup = (name: string) => Object.values(documents).find((d) => !d.deleted && d.name === name);
  const startUpload = () => {
    if (tab === "new") {
      const items: DupItem[] = [];
      files.forEach((f, idx) => { const doc = findDup(f.name); if (doc) items.push({ idx, name: f.name, doc }); });
      if (items.length) { setDupAlert({ items, checked: {} }); return; }
    }
    setProgress(0);
  };
  const confirmDup = () => {
    if (!dupAlert) return;
    const dupIdx = new Set(dupAlert.items.map((x) => x.idx));
    // 重複でない書類は常に含め、重複書類はチェックされたものだけ含める。
    const kept = files.filter((_, i) => !dupIdx.has(i) || dupAlert.checked[i]);
    setDupAlert(null);
    if (kept.length === 0) { onClose(); return; }
    setFiles(kept);
    setProgress(0);
  };

  // アップロード中は新規・分割どちらのタブでも右下のプログレスバーのみで表示を統一
  if (proc) {
    return (
      <div className="up-toast" role="status" aria-live="polite">
        <div className="up-row">
          <span className="up-label">{ocr ? "データ化中（AI-OCR / 明細OCR）" : "ファイルを保存中…"}</span>
          <span className="up-pct">{Math.round(progress!)}%</span>
        </div>
        <div className="up-track">
          <div className="up-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="ovl" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="m-head">
          <span className="t">{tab === "split" ? "請求書（PDFアップロード）の一括作成" : "アップロード"}</span>
          <button className="x" onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div className="m-body">
          <div className="upl-tabs">
            <button className={`upl-tab ${tab === "new" ? "active" : ""}`} onClick={() => setTab("new")}>
              新規アップロード
            </button>
            <button className={`upl-tab ${tab === "split" ? "active" : ""}`} onClick={() => setTab("split")}>
              PDF分割アップロード
            </button>
          </div>

          {tab === "new" ? (
            <>
              <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => e.target.files && setFiles((f) => [...f, ...Array.from(e.target.files!).map((file) => makeUploadEntry(file.name))])} />
              {files.length > 0 ? (
                <div className="dropzone filled" onClick={() => fileRef.current?.click()}>
                  <div className="chips">
                    {files.map((f, i) => (
                      <div className="chip" key={i}>
                        <span className="nm">{f.name}</span>
                        <span className="ln">明細 {f.lines.length}件</span>
                        <button className="x" onClick={(e) => { e.stopPropagation(); setFiles((fs) => fs.filter((_, j) => j !== i)); }}>×</button>
                      </div>
                    ))}
                  </div>
                  <div className="dz-count">合計 {files.length} 件　＋ クリックで追加</div>
                </div>
              ) : (
                <div className="dropzone" onClick={() => fileRef.current?.click()}>
                  <div className="dz-text">ファイルをドラッグ＆ドロップ、または</div>
                  <button className="btn-select" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>ファイルを選択</button>
                </div>
              )}
              <div className="upl-help">
                1ファイル最大50MB・100件まで
                <button className="upl-sample" onClick={() => setFiles((f) => [...f, ...sampleBatch()])}>サンプル請求書を読み込む</button>
              </div>
              <CatRow category={category} categories={categories} onChange={setCategory} />
              <OcrRow ocr={ocr} onChange={setOcr} />
            </>
          ) : (
            <>
              <div className="sp-desc">
                PDFファイル、またはPDFをまとめたZIPから一括で書類を作成できます。金額・日付などはCSVやOCRで補完できます。
              </div>
              <div className="sp-field">
                <div className="sp-flabel">書類の作成方法 <span className="sp-req">*</span></div>
                <div className="sp-radios">
                  <label className="sp-radio"><input type="radio" name="sp-method" checked={method === "zip"} onChange={() => setMethod("zip")} />ZIPファイルで作成</label>
                  <label className="sp-radio"><input type="radio" name="sp-method" checked={method === "pdf"} onChange={() => setMethod("pdf")} />PDFファイルで作成</label>
                </div>
              </div>
              <div className="sp-field">
                <div className="sp-flabel">PDFファイル <span className="sp-qi" title="取引先に送付したい請求書等のPDF">?</span><span className="sp-req">*</span></div>
                {splitFile ? (
                  <div className="dropzone filled">
                    <div className="chips">
                      <div className="chip">
                        <span className="nm">{splitFile}</span>
                        <button className="x" onClick={() => { setSplitFile(null); setSplit(false); setSettingsOpen(false); setPages(null); }}>×</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="dropzone" onClick={loadDemoSplit}>
                    <div className="dz-text">ファイルをドラッグ＆ドロップ、または</div>
                    <button className="btn-select" onClick={(e) => { e.stopPropagation(); loadDemoSplit(); }}>ファイルを選択</button>
                  </div>
                )}
              </div>
              <div className="sp-field">
                <div className="sp-flabel">PDFを分割して取り込む <span className="sp-qi" title="複数の取引先宛が同じPDFに含まれる場合に分割">?</span></div>
                <div className="sp-toggle-row">
                  <Switch checked={split} onChange={toggleSplit} disabled={!splitFile} label="分割する" />
                  <span style={{ fontSize: 13, color: splitFile ? "var(--ink)" : "var(--inkFaint)" }}>分割する</span>
                  {split && splitFile && (
                    <button className="sp-prev-btn" onClick={() => setSettingsOpen(true)}>分割プレビュー</button>
                  )}
                </div>
              </div>
              <div className="sp-field">
                <CatRow category={category} categories={categories} onChange={setCategory} />
              </div>
              <div className="sp-field">
                <OcrRow ocr={ocr} onChange={setOcr} />
              </div>
            </>
          )}
        </div>

        <div className="m-foot">
          <Button variant="cancel" onClick={onClose}>キャンセル</Button>
          <button className="btn-upload" disabled={!canUpload} onClick={startUpload}>アップロード</button>
        </div>
      </div>

      {dupAlert && (
        <div className="ovl" style={{ zIndex: 80 }} onMouseDown={(e) => e.target === e.currentTarget && setDupAlert(null)}>
          <div className="modal" style={{ width: "min(560px, 100%)" }}>
            <div className="m-head">
              <span className="t" />
              <button className="x" onClick={() => setDupAlert(null)}><IconX /></button>
            </div>
            <div className="m-body">
              <p className="dup-lead">
                今回選択した書類全{files.length}件のうち{dupAlert.items.length}件が、すでに同じ書類名で保存されています。<br />
                アップロードに含める書類をチェックしてください。
              </p>
              <div className="dup-list">
                {dupAlert.items.map((it) => {
                  const meta = [it.doc.vendor, it.doc.category || "営業所未選択", it.doc.status].filter(Boolean).join("・");
                  return (
                    <label className="dup-item" key={it.idx}>
                      <input
                        type="checkbox"
                        checked={!!dupAlert.checked[it.idx]}
                        onChange={() => setDupAlert((d) => d && { ...d, checked: { ...d.checked, [it.idx]: !d.checked[it.idx] } })}
                      />
                      <div className="dup-main">
                        <div className="dup-name">{it.name}</div>
                        <div className="dup-sub">・ <span className="dup-no">No.{it.doc.no}</span> {meta}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="m-foot">
              <Button variant="cancel" onClick={() => setDupAlert(null)}>キャンセル</Button>
              <button className="btn-upload" onClick={confirmDup}>アップロード</button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && pages && (
        <SplitSettingsModal
          pages={pages}
          fileName={splitFile ?? ""}
          onChange={setPages}
          onClose={() => setSettingsOpen(false)}
          onApply={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function CatRow({ category, categories, onChange }: { category: string; categories: string[]; onChange: (v: string) => void }) {
  return (
    <div className="uplcat">
      <span style={{ fontWeight: 700, color: "var(--inkSoft)" }}>営業所</span>
      <select className="in" style={{ maxWidth: 220 }} value={category} onChange={(e) => onChange(e.target.value)}>
        <option value="">（未選択）</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}

function OcrRow({ ocr, onChange }: { ocr: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="ocr-row" style={{ marginTop: 0 }}>
      <Switch checked={ocr} onChange={onChange} label="AI-OCR" />
      <div>
        <div className="txt">AI-OCRで明細を自動データ化する</div>
        <div className="sub">取引先・金額・対象車両・コスト分類を読み取ります（pdf, png, jpg）</div>
      </div>
    </div>
  );
}
