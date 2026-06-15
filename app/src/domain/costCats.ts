/**
 * コスト分類マスタ（コスト構造の真実源）。
 *
 * 「親コスト分類（cat）」と、その付随情報（想定書類タイプ）をマスタデータとして集約する。
 * 表示色は catStyleOf(name)、連携用の内訳（subCat）は subcatsOf(name) から派生する従属値であり、
 * 内訳コードは外部サービス連携の契約キーのため UI からは変更せず参照のみとする（catStyle / repairSubcat が真実源）。
 */
import type { Subcat } from "./repairSubcat";
import { SUBCATS_BY_CAT } from "./repairSubcat";

/** コスト分類マスタの1件。 */
export interface CostCat {
  name: string;
  /** 想定される書類タイプ。コストモニター内訳集計・書類タイプのヒント表示に使う。 */
  docTypes: string[];
}

/** 既定のコスト分類名（旧 settings.DEFAULT_CATS）。 */
export const DEFAULT_CAT_NAMES = ["燃料費", "修繕・維持費", "通行料", "保険料", "調達コスト", "税金"];

/** 分類名 → 既定の想定書類タイプ（旧 settings.DEFAULT_CAT_DOCTYPES）。 */
const DEFAULT_DOCTYPES_BY_CAT: Record<string, string[]> = {
  燃料費: ["請求書"],
  "修繕・維持費": ["請求書", "見積書"],
  通行料: ["明細書", "請求書"],
  保険料: ["保険証券", "請求書"],
  調達コスト: ["請求書", "明細書"],
  税金: ["納付書", "明細書"],
};

/** マスタ初期データ。 */
export const DEFAULT_COST_CATS: CostCat[] = DEFAULT_CAT_NAMES.map((name) => ({
  name,
  docTypes: [...(DEFAULT_DOCTYPES_BY_CAT[name] ?? ["請求書"])],
}));

/** 分類名 → 連携用内訳（参照表示用）。内訳を持たない分類は空配列。 */
export function subcatsOf(cat: string): readonly Subcat[] {
  return SUBCATS_BY_CAT[cat] ?? [];
}

/** コスト分類マスタ → 想定書類タイプの Record（expectedDocTypes 等の純関数に渡す形）。 */
export function catDocTypesRecord(cats: CostCat[]): Record<string, string[]> {
  return Object.fromEntries(cats.map((c) => [c.name, c.docTypes]));
}
