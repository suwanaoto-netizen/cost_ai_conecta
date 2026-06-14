import type { DocType } from "./types";

export type ExternalFormat = "json" | "csv" | "xml";

export interface Settings {
  companyName: string;
  defaultOcr: boolean;
  matchThreshold: number; // 0.5..0.99
  defaultPageSize: number;
  logipokeEnabled: boolean;
  logipokeUrl: string;
  logipokeKey: string;
  autoReflect: boolean;
  mobipokeEnabled: boolean;
  mobipokeUrl: string;
  mobipokeKey: string;
  mobipokeAuto: boolean;
  externalEnabled: boolean;
  externalName: string;
  externalUrl: string;
  externalKey: string;
  externalFormat: ExternalFormat;
}

/** 設定ページが編集対象とする全データのスナップショット。 */
export interface SettingsSnapshot {
  settings: Settings;
  categories: string[]; // 営業所
  cats: string[]; // コスト分類
  catDocTypes: Record<string, string[]>; // 分類 → 想定書類タイプ
}

export const DOC_TYPES: DocType[] = [
  "請求書", "見積書", "領収書", "納品書", "明細書", "保険証券", "納付書",
];

export const DEFAULT_SETTINGS: Settings = {
  companyName: "サンプル物流株式会社",
  defaultOcr: true,
  matchThreshold: 0.85,
  defaultPageSize: 20,
  logipokeEnabled: true,
  logipokeUrl: "https://api.logipoke.example.com/v1",
  logipokeKey: "lpk_live_••••••••3a9f",
  autoReflect: false,
  mobipokeEnabled: false,
  mobipokeUrl: "https://api.mobipoke.example.com/v1",
  mobipokeKey: "mbp_live_••••••••7c2d",
  mobipokeAuto: false,
  externalEnabled: false,
  externalName: "自社基幹システム",
  externalUrl: "https://example.com/webhook",
  externalKey: "ext_••••••••f10b",
  externalFormat: "json",
};

export const DEFAULT_CATEGORIES = [
  "名古屋営業所", "岡崎営業所", "一宮営業所", "岐阜営業所", "四日市営業所",
];

export const DEFAULT_CATS = ["燃料費", "修繕・維持費", "通行料", "保険料", "調達コスト", "税金"];

export const DEFAULT_CAT_DOCTYPES: Record<string, string[]> = {
  燃料費: ["請求書"],
  "修繕・維持費": ["請求書", "見積書"],
  通行料: ["明細書", "請求書"],
  保険料: ["保険証券", "請求書"],
  調達コスト: ["請求書", "明細書"],
  税金: ["納付書", "明細書"],
};

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export function freshSnapshot(): SettingsSnapshot {
  return {
    settings: clone(DEFAULT_SETTINGS),
    categories: [...DEFAULT_CATEGORIES],
    cats: [...DEFAULT_CATS],
    catDocTypes: clone(DEFAULT_CAT_DOCTYPES),
  };
}

export function snapshotEquals(a: SettingsSnapshot, b: SettingsSnapshot): boolean {
  return (
    JSON.stringify(a.settings) === JSON.stringify(b.settings) &&
    JSON.stringify(a.categories) === JSON.stringify(b.categories) &&
    JSON.stringify(a.cats) === JSON.stringify(b.cats) &&
    JSON.stringify(a.catDocTypes) === JSON.stringify(b.catDocTypes)
  );
}

const FIELD_LABELS: Partial<Record<keyof Settings, string>> = {
  companyName: "自社名",
  defaultOcr: "既定でAI-OCRを使う",
  matchThreshold: "突合しきい値",
  defaultPageSize: "既定の表示件数",
  logipokeEnabled: "ロジポケ連携",
  logipokeUrl: "ロジポケ連携先エンドポイント",
  logipokeKey: "ロジポケAPIキー",
  autoReflect: "ロジポケへ自動でデータ連携",
  mobipokeEnabled: "モビポケ連携",
  mobipokeUrl: "モビポケ連携先エンドポイント",
  mobipokeKey: "モビポケAPIキー",
  mobipokeAuto: "モビポケへ自動でデータ連携",
  externalEnabled: "外部サービス連携",
  externalName: "外部サービス名",
  externalUrl: "外部連携先エンドポイント",
  externalKey: "外部サービスAPIキー",
  externalFormat: "送信フォーマット",
};

/** 変更点を人が読める差分として列挙（保存確認モーダル用）。 */
export function diffSnapshots(live: SettingsSnapshot, draft: SettingsSnapshot): string[] {
  const out: string[] = [];
  (Object.keys(FIELD_LABELS) as (keyof Settings)[]).forEach((k) => {
    if (JSON.stringify(draft.settings[k]) === JSON.stringify(live.settings[k])) return;
    let was: unknown = live.settings[k];
    let now: unknown = draft.settings[k];
    if (k === "matchThreshold") {
      was = Math.round((was as number) * 100) + "%";
      now = Math.round((now as number) * 100) + "%";
    } else if (typeof was === "boolean") {
      was = was ? "ON" : "OFF";
      now = (now as boolean) ? "ON" : "OFF";
    }
    out.push(`${FIELD_LABELS[k]}：${was} → ${now}`);
  });
  const diffArr = (l: string[], d: string[], label: string) => {
    d.filter((x) => !l.includes(x)).forEach((x) => out.push(`${label}を追加：${x}`));
    l.filter((x) => !d.includes(x)).forEach((x) => out.push(`${label}を削除：${x}`));
  };
  diffArr(live.categories, draft.categories, "営業所");
  diffArr(live.cats, draft.cats, "コスト分類");
  draft.cats.forEach((c) => {
    if (!live.cats.includes(c)) return;
    const a = (live.catDocTypes[c] ?? []).slice().sort();
    const b = (draft.catDocTypes[c] ?? []).slice().sort();
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`「${c}」の想定書類タイプを変更`);
  });
  return out;
}
