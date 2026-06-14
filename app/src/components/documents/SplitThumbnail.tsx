import type { SplitPage } from "../../domain/splitDemo";

/** 分割プレビューのモックサムネイル（表紙／明細）。 */
export function SplitThumbnail({ page }: { page: SplitPage }) {
  if (page.type === "cover") {
    return (
      <div className="spt">
        <div className="spt-r1">
          <span className="spt-h">請求書</span>
          <span className="spt-date">
            2024年06月12日
            <br />
            請求番号:{page.no}
          </span>
        </div>
        <div className="spt-logo">
          株式会社サンプル
          <span className="spt-stamp">
            株式
            <br />
            会社
          </span>
        </div>
        <div className="spt-to">{page.to} 御中</div>
        <div className="spt-meta">
          〒000-0000 東京都中央区XXXXX
          <br />
          TEL:00-1111-2222
        </div>
        <div className="spt-total">
          <span>合計(税込)</span>
          <b>{page.total}</b>
        </div>
        <div className="spt-bars">
          <i style={{ width: "100%" }} />
          <i style={{ width: "88%" }} />
          <i style={{ width: "94%" }} />
        </div>
      </div>
    );
  }
  return (
    <div className="spt">
      <div className="spt-dh">請求書明細</div>
      <table className="spt-tbl">
        <tbody>
          <tr>
            <td>品名</td>
            <td>数量</td>
            <td>単価</td>
            <td>金額</td>
          </tr>
          {Array.from({ length: 14 }, (_, k) => (
            <tr key={k}>
              <td>商品A</td>
              <td>10個</td>
              <td>5,000</td>
              <td>50,000</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
