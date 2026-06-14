import type { Line } from "../../domain/types";
import { docDate, docTotal } from "../../domain/documents";
import { yen } from "../../domain/format";

/** 右側の請求書プレビュー（読み取り箇所をハイライト）。 */
export function InvoicePreview({
  no,
  vendor,
  lines,
  companyName,
  zoom,
}: {
  no: number;
  vendor: string;
  lines: Line[];
  companyName: string;
  zoom: number;
}) {
  const sub = docTotal(lines);
  const tax = Math.round(sub * 0.1);
  return (
    <div className="pv-page" style={{ transform: `scale(${zoom / 100})` }}>
      <div className="iv-h">
        <div>
          <div className="iv-title">請求書</div>
          <div className="iv-no">No. INV-2026-{1000 + no}</div>
        </div>
        <div className="iv-issuer">
          <b>{vendor || "（取引先 未読取）"}</b>
          <br />
          <span>登録番号 T1234567890123</span>
          <br />
          <span>名古屋市中区錦1-2-3</span>
        </div>
      </div>
      <div className="iv-to">{companyName} 御中</div>
      <div className="iv-meta">発行日：{docDate(lines)}　／　お支払期限：翌月末</div>
      <table className="iv-tbl">
        <thead>
          <tr>
            <th>項目</th>
            <th className="r">数量</th>
            <th className="r">金額</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.lid}>
              <td>
                <span className="mk mk-g">{l.item}</span>
                <div className="iv-veh">
                  <span className="mk mk-r">車番 {l.plate || "—"}</span>
                </div>
              </td>
              <td className="r">1</td>
              <td className="r">
                <span className="mk mk-b">{yen(l.amount)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="iv-sum">
        <div>
          <span>小計</span>
          <span>{yen(sub)}</span>
        </div>
        <div>
          <span>消費税(10%)</span>
          <span>{yen(tax)}</span>
        </div>
        <div className="iv-total">
          <span>合計</span>
          <span>{yen(sub + tax)}</span>
        </div>
      </div>
    </div>
  );
}
