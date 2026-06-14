import type { DocStatus } from "../../domain/types";
import { STATUS_CLASS } from "../../domain/catStyle";

const LockIcon = () => (
  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: -1 }}>
    <rect x={5} y={11} width={14} height={10} rx={2} />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

/** 書類ステータスチップ。連携済みは鍵アイコン付き。 */
export function StatusChip({ status }: { status: DocStatus }) {
  return (
    <span className={`st ${STATUS_CLASS[status]}`}>
      <span className="dot" />
      {status}
      {status === "連携済み" && <LockIcon />}
    </span>
  );
}
