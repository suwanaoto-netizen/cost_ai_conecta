/**
 * 個別モニターの「車両ごとのコスト一覧」で横一列に並べる項目値の算出。
 *
 * 書類一覧で連携済みの書類明細（および手動明細）を、車両ごとに「親コスト分類の通算」と
 * 「内訳項目の金額」へ集計する。内訳は repairSubcat の内訳コード（subCat）と品名キーワードで判定する。
 *
 * NOTE: 定期点検・修理の「部品代／技術代」内訳と「リース総額」は、現状のデータが明細単位の
 * 「合計金額」しか持たないため個別値を算出できない。これらは na=true として "—" 表示にする
 * （本番で書類項目が埋まれば、ここを実値に差し替える）。
 */
import type { Vehicle } from "./vehicles";
import { resolveSubcat, FUEL_CAT, REPAIR_CAT, INSURANCE_CAT } from "./repairSubcat";

const TOLL_CAT = "通行料";
const PROCUREMENT_CAT = "調達コスト";
const TAX_CAT = "税金";

export interface VehMetric {
  /** 分類名を除いた項目ラベル。 */
  label: string;
  value: number;
  /** データ未保有（按分不可）の項目。"—" 表示にする。 */
  na?: boolean;
  /** その分類の通算（先頭・強調表示）。 */
  isSum?: boolean;
}

export interface VehMetricGroup {
  /** 親コスト分類（色付け・見出し用）。 */
  cat: string;
  metrics: VehMetric[];
}

/** 1車両ぶんの横一列メトリクスを、親コスト分類ごとにグループ化して返す。 */
export function vehicleMetrics(v: Vehicle): VehMetricGroup[] {
  const bySub: Record<string, number> = {};
  let jidoshazei = 0;
  let juryozei = 0;
  let leaseMonthly = 0;

  for (const l of v.lines) {
    const sub = resolveSubcat(l.cat, l.item);
    if (sub) bySub[sub] = (bySub[sub] || 0) + (+l.amount || 0);
    if (l.cat === TAX_CAT) {
      if (l.item.includes("重量税")) juryozei += +l.amount || 0;
      else if (l.item.includes("自動車税")) jidoshazei += +l.amount || 0;
    }
    if (l.cat === PROCUREMENT_CAT && l.item.includes("リース")) leaseMonthly += +l.amount || 0;
  }

  const cat = (c: string) => v.byCat[c] || 0;
  const sub = (code: string) => bySub[code] || 0;
  const inspect = sub("inspect_shaken") + sub("inspect_3m") + sub("inspect_other");

  return [
    {
      cat: FUEL_CAT,
      metrics: [
        { label: "通算", value: cat(FUEL_CAT), isSum: true },
        { label: "給油履歴（ガソリン・軽油・アドブルー）レシート／カード明細金額（円）", value: cat(FUEL_CAT) },
      ],
    },
    {
      cat: REPAIR_CAT,
      metrics: [
        { label: "通算", value: cat(REPAIR_CAT), isSum: true },
        { label: "定期点検請求書 合計金額（円）", value: inspect },
        { label: "定期点検請求書 部品代（円）", value: 0, na: true },
        { label: "定期点検請求書 技術代（円）", value: 0, na: true },
        { label: "修理 合計金額", value: sub("repair") },
        { label: "修理 部品代（円）", value: 0, na: true },
        { label: "修理 技術代（円）", value: 0, na: true },
        { label: "タイヤ交換金額（円）", value: sub("tire") },
      ],
    },
    {
      cat: INSURANCE_CAT,
      metrics: [
        { label: "通算", value: cat(INSURANCE_CAT), isSum: true },
        { label: "自賠責保険 保険費用（円）", value: sub("jibaiseki") },
        { label: "任意保険 保険費用（円）", value: sub("voluntary") },
      ],
    },
    {
      cat: PROCUREMENT_CAT,
      metrics: [
        { label: "通算", value: cat(PROCUREMENT_CAT), isSum: true },
        { label: "リース 総額（円）", value: 0, na: true },
        { label: "リース 月間リース料金（円）", value: leaseMonthly },
      ],
    },
    {
      cat: TAX_CAT,
      metrics: [
        { label: "通算", value: cat(TAX_CAT), isSum: true },
        { label: "自動車税 費用（円）", value: jidoshazei },
        { label: "重量税 費用（円）", value: juryozei },
      ],
    },
    {
      cat: TOLL_CAT,
      metrics: [
        { label: "通算", value: cat(TOLL_CAT), isSum: true },
        { label: "高速道路通行料（ETC）金額（円）", value: cat(TOLL_CAT) },
      ],
    },
  ];
}
