import { useState } from "react";
import type { SplitPage } from "../../domain/splitDemo";
import { splitGroups } from "../../domain/splitDemo";
import { SplitThumbnail } from "./SplitThumbnail";
import { Button } from "../common/Button";
import { IconX, IconCheck } from "../common/Icon";

const Scissors = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx={6} cy={6} r={3} />
    <path d="M8.12 8.12 12 12" />
    <path d="M20 4 8.12 15.88" />
    <circle cx={6} cy={18} r={3} />
    <path d="M14.8 14.8 20 20" />
  </svg>
);

export function SplitSettingsModal({
  pages,
  fileName,
  onChange,
  onClose,
  onApply,
}: {
  pages: SplitPage[];
  fileName: string;
  onChange: (pages: SplitPage[]) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  const [bulkMenu, setBulkMenu] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);

  const groups = splitGroups(pages);
  const inc = pages.filter((p) => p.include).length;
  const togglePage = (i: number) => onChange(pages.map((p, j) => (j === i ? { ...p, include: !p.include } : p)));
  const toggleDiv = (i: number) => onChange(pages.map((p, j) => (j === i ? { ...p, splitAfter: !p.splitAfter } : p)));
  const bulkOp = (all: boolean) => { onChange(pages.map((p) => ({ ...p, include: all }))); setBulkMenu(false); };

  return (
    <div className="ovl" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal spm">
        <div className="m-head">
          <span className="t">PDF分割設定</span>
          <button className="x" style={{ marginLeft: "auto" }} onClick={onClose}>
            <IconX />
          </button>
        </div>
        <div className="spm-desc">
          PDFファイルを任意の位置で分割したり、特定のページを取り込まないなどが設定できます。右下のアイコンで拡大確認できます。
        </div>
        <div className="spm-bar">
          <div className="spm-count">
            {groups.length}書類に分割（計：{inc}ページ）
          </div>
          <div className="spm-bulk">
            <button className="spm-bulk-btn" onClick={() => setBulkMenu((b) => !b)}>
              ページ一括操作 ▾
            </button>
            {bulkMenu && (
              <div className="spm-bulk-menu">
                <button onClick={() => bulkOp(true)}>全ページを取り込む</button>
                <button onClick={() => bulkOp(false)}>全ページを取り込まない</button>
              </div>
            )}
          </div>
        </div>
        <div className="spm-strip">
          {pages.map((p, i) => {
            const g = groups.find((gr) => gr.includes(p))!;
            const label = `${g.indexOf(p) + 1} / ${g.length}`;
            return (
              <div style={{ display: "flex", alignItems: "flex-start" }} key={i}>
                <div className="sp-page">
                  <div className={`sp-card ${p.include ? "" : "ex"}`}>
                    <SplitThumbnail page={p} />
                    <button className={`sp-chk ${p.include ? "on" : ""}`} title="取り込む / 取り込まない" onClick={() => togglePage(i)}>
                      {p.include && <IconCheck color="#fff" size={12} />}
                    </button>
                    <button className="sp-zoom" title="拡大して確認" onClick={() => setZoom(i)}>
                      ⌕
                    </button>
                  </div>
                  <div className="sp-pagenum">{label}</div>
                </div>
                {i < pages.length - 1 && (
                  <div className={`sp-div ${p.splitAfter ? "boundary" : ""}`} onClick={() => toggleDiv(i)}>
                    <div className="sp-div-ic">{p.splitAfter ? "＋" : <Scissors />}</div>
                    <div className="sp-div-tip">{p.splitAfter ? "結合する" : "分割する"}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding: "12px 22px 4px" }}>
          <span style={{ color: "var(--blue)", fontSize: 13 }}>{fileName} ↗</span>
        </div>
        <div className="m-foot">
          <Button variant="cancel" onClick={onClose}>
            キャンセル
          </Button>
          <button className="btn-upload blue" onClick={onApply}>
            設定する
          </button>
        </div>
      </div>

      {zoom != null && (
        <div className="sp-zoomovl" onMouseDown={(e) => e.target === e.currentTarget && setZoom(null)}>
          <div className="sp-zoomcard">
            <SplitThumbnail page={pages[zoom]} />
            <button className="sp-zoomclose" onClick={() => setZoom(null)}>
              <IconX size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
