/** 金額表示。¥ + ja-JP 区切り。 */
export const yen = (n: number): string => "¥" + Math.round(n).toLocaleString("ja-JP");
