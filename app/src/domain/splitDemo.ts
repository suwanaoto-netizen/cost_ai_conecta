/** PDF分割アップロードのデモ用ページモデル（プロトタイプ buildSplitPages を移植）。 */
export interface SplitPage {
  type: "cover" | "detail";
  no?: string;
  to?: string;
  total?: string;
  include: boolean;
  splitAfter: boolean;
}

export function buildSplitPages(): SplitPage[] {
  return (
    [
      { type: "cover", no: "IN202406-0015", to: "サンプル産業株式会社", total: "¥2,365,000" },
      { type: "detail" },
      { type: "detail" },
      { type: "cover", no: "IN202406-0016", to: "テスト株式会社", total: "¥2,611,400" },
      { type: "detail" },
      { type: "detail" },
      { type: "detail" },
      { type: "cover", no: "IN202406-0017", to: "株式会社デモ商会", total: "¥1,210,000" },
      { type: "detail" },
    ] as { type: "cover" | "detail"; no?: string; to?: string; total?: string }[]
  ).map((p, i) => ({ ...p, include: true, splitAfter: i === 2 || i === 6 }));
}

/** splitAfter 境界でページをグループ（＝作成される書類）に分ける。 */
export function splitGroups(pages: SplitPage[]): SplitPage[][] {
  const g: SplitPage[][] = [];
  let cur: SplitPage[] = [];
  pages.forEach((p, i) => {
    cur.push(p);
    if (p.splitAfter && i < pages.length - 1) {
      g.push(cur);
      cur = [];
    }
  });
  if (cur.length) g.push(cur);
  return g;
}
