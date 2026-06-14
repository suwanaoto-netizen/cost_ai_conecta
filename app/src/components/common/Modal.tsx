import { useEffect, useRef, type ReactNode } from "react";
import { IconX } from "./Icon";

interface ModalProps {
  title?: string;
  width?: number;
  dismissable?: boolean;
  onClose: () => void;
  children: ReactNode;
  /** スタック最前面のみフォーカストラップ＆Esc を有効化する。 */
  isTop: boolean;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/**
 * 共通モーダル。全消し再描画ではないため、フォーカストラップ・open時フォーカス移動・
 * close時フォーカス復帰・Esc/バックドロップ閉じ・aria-modal を成立させられる（⑤⑰の解消）。
 */
export function Modal({ title, width = 560, dismissable = true, onClose, children, isTop }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isTop) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // open時：モーダル内の最初のフォーカス可能要素へ移動
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissable) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first2 = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first2) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first2.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      // close時：元のフォーカスへ復帰
      restoreRef.current?.focus?.();
    };
  }, [isTop, dismissable, onClose]);

  return (
    <div
      className="ovl"
      onMouseDown={(e) => {
        if (dismissable && isTop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="modal"
        role="dialog"
        aria-modal={isTop}
        aria-label={title}
        tabIndex={-1}
        style={{ width: `min(${width}px, 100%)` }}
      >
        {title && (
          <div className="m-head">
            <span className="t">{title}</span>
            <button className="x" aria-label="閉じる" onClick={onClose}>
              <IconX />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
