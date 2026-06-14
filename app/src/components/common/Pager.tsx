import { Button } from "./Button";

interface PagerProps {
  total: number;
  page: number;
  perPage: number;
  perPageOptions?: number[];
  onPage: (p: number) => void;
  onPerPage: (n: number) => void;
}

/** 件数選択＋前後ナビ。 */
export function Pager({ total, page, perPage, perPageOptions = [20, 50, 100], onPage, onPerPage }: PagerProps) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const cur = Math.min(page, pages);
  const from = total === 0 ? 0 : (cur - 1) * perPage + 1;
  const to = Math.min(cur * perPage, total);
  return (
    <div className="pager">
      <label>
        表示件数{" "}
        <select value={perPage} onChange={(e) => onPerPage(+e.target.value)}>
          {perPageOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <span className="pg-range">
        <b>{from}</b>–<b>{to}</b> / <b>{total}</b> 件
      </span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <Button variant="icon" aria-label="前のページ" disabled={cur <= 1} onClick={() => onPage(cur - 1)}>
          ‹
        </Button>
        <Button variant="icon" aria-label="次のページ" disabled={cur >= pages} onClick={() => onPage(cur + 1)}>
          ›
        </Button>
      </div>
    </div>
  );
}
