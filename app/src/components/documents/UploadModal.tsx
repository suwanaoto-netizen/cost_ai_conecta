import { useEffect, useRef, useState } from "react";
import { useDataStore, type UploadEntry } from "../../store/data";
import { useSettingsStore } from "../../store/settings";
import { makeUploadEntry, sampleBatch } from "../../domain/uploadGen";
import { Button } from "../common/Button";
import { Switch } from "../common/Switch";
import { IconX } from "../common/Icon";

export function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: (count: number) => void }) {
  const addDocuments = useDataStore((s) => s.addDocuments);
  const defaultOcr = useSettingsStore((s) => s.live.settings.defaultOcr);
  const categories = useSettingsStore((s) => s.live.categories);

  const [files, setFiles] = useState<UploadEntry[]>([]);
  const [ocr, setOcr] = useState(defaultOcr);
  const [category, setCategory] = useState(categories[0] ?? "");
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 進捗アニメーション → 完了で確定
  useEffect(() => {
    if (progress == null) return;
    if (progress >= 100) {
      const t = setTimeout(() => {
        addDocuments(files, ocr, category);
        onDone(files.length);
      }, 360);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setProgress((p) => Math.min(100, (p ?? 0) + 5 + Math.random() * 6)), 170);
    return () => clearTimeout(t);
  }, [progress, files, ocr, category, addDocuments, onDone]);

  const proc = progress != null;
  const addFiles = (fl: FileList | null) => {
    if (!fl) return;
    setFiles((f) => [...f, ...Array.from(fl).map((file) => makeUploadEntry(file.name))]);
  };

  return (
    <div className="ovl" onMouseDown={(e) => !proc && e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="m-head">
          <span className="t">アップロード</span>
          {!proc && (
            <button className="x" onClick={onClose}>
              <IconX />
            </button>
          )}
        </div>
        <div className="m-body" style={proc ? { opacity: 0.55, pointerEvents: "none" } : undefined}>
          <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />
          {files.length > 0 ? (
            <div className="dropzone filled" onClick={() => fileRef.current?.click()}>
              <div className="chips">
                {files.map((f, i) => (
                  <div className="chip" key={i}>
                    <span className="nm">{f.name}</span>
                    <span className="ln">明細 {f.lines.length}件</span>
                    <button className="x" title="削除" onClick={(e) => { e.stopPropagation(); setFiles((fs) => fs.filter((_, j) => j !== i)); }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="dz-count">合計 {files.length} 件　＋ クリックで追加</div>
            </div>
          ) : (
            <div className="dropzone" onClick={() => fileRef.current?.click()}>
              <div className="dz-text">ファイルをドラッグ＆ドロップ、または</div>
              <button className="btn-select" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                ファイルを選択
              </button>
            </div>
          )}
          <div className="upl-help">
            1ファイル最大50MB・100件まで
            {!proc && (
              <button className="upl-sample" onClick={() => setFiles((f) => [...f, ...sampleBatch()])}>
                サンプル請求書を読み込む
              </button>
            )}
          </div>
          <div className="uplcat">
            <span style={{ fontWeight: 700, color: "var(--inkSoft)" }}>営業所</span>
            <select className="in" style={{ maxWidth: 220 }} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">（未選択）</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="ocr-row">
            <Switch checked={ocr} onChange={setOcr} label="AI-OCR" />
            <div>
              <div className="txt">AI-OCRで明細を自動データ化する</div>
              <div className="sub">取引先・金額・対象車両・コスト分類を読み取ります（pdf, png, jpg）</div>
            </div>
          </div>
        </div>
        {proc ? (
          <div className="m-foot" style={{ display: "block" }}>
            <div className="uprog">
              <div className="up-row">
                <span className="up-label">{ocr ? "データ化中（AI-OCR / 明細OCR）" : "ファイルを保存中…"}</span>
                <span className="up-pct">{Math.round(progress!)}%</span>
              </div>
              <div className="up-track">
                <div className="up-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="m-foot">
            <Button variant="cancel" onClick={onClose}>
              キャンセル
            </Button>
            <button className="btn-upload" disabled={files.length === 0} onClick={() => setProgress(0)}>
              アップロード
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
