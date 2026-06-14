import type { DocStatus, MatchState } from "./types";

/** コスト分類の表示色（プロトタイプ CAT_STYLE から移植）。 */
export const CAT_STYLE: Record<string, { fg: string; bg: string }> = {
  燃料費: { fg: "#1E55C8", bg: "#E5EDFB" },
  "修繕・維持費": { fg: "#157F73", bg: "#DCEFEC" },
  通行料: { fg: "#B87514", bg: "#FBEFD8" },
  保険料: { fg: "#6B4FA3", bg: "#EFEAF7" },
  調達コスト: { fg: "#3B4DA0", bg: "#E6E9F7" },
  税金: { fg: "#5A6472", bg: "#E9ECE6" },
};
export const catStyleOf = (cat: string) => CAT_STYLE[cat] ?? CAT_STYLE["税金"];

/** 書類ステータスの表示クラス。 */
export const STATUS_CLASS: Record<DocStatus, string> = {
  未入力: "st-todo",
  入力済み: "st-done",
  連携済み: "st-reflected",
};

/** 突合状態のバッジ表示メタ（色・ラベル）。 */
export const MATCH_META: Record<MatchState, { label: string; fg: string; bg: string }> = {
  existing: { label: "既存車両に紐付け", fg: "var(--teal)", bg: "var(--tealSoft)" },
  "existing-suspect": { label: "要確認：既存車両（読み取り疑い）", fg: "var(--alert)", bg: "var(--alertSoft)" },
  new: { label: "新規車両を作成", fg: "var(--amber)", bg: "var(--amberSoft)" },
  suspect: { label: "要確認：読み取り疑い", fg: "var(--alert)", bg: "var(--alertSoft)" },
  missing: { label: "対象車両が未選択", fg: "var(--inkSoft)", bg: "#EEF0F3" },
};
