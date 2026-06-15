import { create } from "zustand";
import {
  diffSnapshots,
  freshSnapshot,
  snapshotEquals,
  type Settings,
  type SettingsSnapshot,
} from "../domain/settings";

type BooleanSettingKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

interface SettingsStore {
  live: SettingsSnapshot;
  draft: SettingsSnapshot | null;

  ensureDraft: () => SettingsSnapshot;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  toggleSetting: (k: BooleanSettingKey) => void;
  setMatchThreshold: (pct: number) => void;
  setDefaultPageSize: (n: number) => void;
  addCategory: (name: string) => boolean; // false=重複
  removeCategory: (name: string) => void;
  addCat: (name: string) => boolean; // false=重複
  removeCat: (name: string) => void;
  toggleCatDocType: (cat: string, dtype: string) => void;
  discard: () => void;
  commit: () => void;
}

/** 編集中ドラフトの基点（無ければ live）。live は不変なので参照共有してよい。 */
const base = (s: Pick<SettingsStore, "live" | "draft">): SettingsSnapshot => s.draft ?? s.live;

export const useSettingsStore = create<SettingsStore>((set, get) => {
  // 変更箇所だけ新オブジェクトに差し替える構造共有の更新（全体ディープクローンを廃止）。
  const patch = (fn: (d: SettingsSnapshot) => SettingsSnapshot) =>
    set((s) => ({ draft: fn(base(s)) }));

  return {
    live: freshSnapshot(),
    draft: null,

    ensureDraft: () => {
      const cur = get().draft;
      if (cur) return cur;
      // live は以後イミュータブル更新でしか触らないため、初期ドラフトは参照共有でよい。
      const d = get().live;
      set({ draft: d });
      return d;
    },
    setSetting: (k, v) => patch((d) => ({ ...d, settings: { ...d.settings, [k]: v } })),
    toggleSetting: (k) => patch((d) => ({ ...d, settings: { ...d.settings, [k]: !d.settings[k] } })),
    setMatchThreshold: (pct) =>
      patch((d) => ({ ...d, settings: { ...d.settings, matchThreshold: Math.max(0.5, Math.min(0.99, pct / 100)) } })),
    setDefaultPageSize: (n) => patch((d) => ({ ...d, settings: { ...d.settings, defaultPageSize: n } })),
    addCategory: (name) => {
      const t = name.trim();
      if (!t || base(get()).categories.includes(t)) return false;
      patch((d) => ({ ...d, categories: [...d.categories, t] }));
      return true;
    },
    removeCategory: (name) =>
      patch((d) => ({ ...d, categories: d.categories.filter((c) => c !== name) })),
    addCat: (name) => {
      const t = name.trim();
      if (!t || base(get()).cats.includes(t)) return false;
      patch((d) => ({
        ...d,
        cats: [...d.cats, t],
        catDocTypes: d.catDocTypes[t] ? d.catDocTypes : { ...d.catDocTypes, [t]: ["請求書"] },
      }));
      return true;
    },
    removeCat: (name) =>
      patch((d) => {
        const { [name]: _omit, ...catDocTypes } = d.catDocTypes;
        return { ...d, cats: d.cats.filter((c) => c !== name), catDocTypes };
      }),
    toggleCatDocType: (cat, dtype) =>
      patch((d) => {
        const arr = d.catDocTypes[cat] ?? [];
        const next = arr.includes(dtype) ? arr.filter((t) => t !== dtype) : [...arr, dtype];
        return { ...d, catDocTypes: { ...d.catDocTypes, [cat]: next } };
      }),
    discard: () => set({ draft: null }),
    commit: () =>
      set((s) => (s.draft ? { live: s.draft, draft: null } : {})),
  };
});

/** 派生：未保存変更があるか。 */
export const settingsIsDirty = (s: Pick<SettingsStore, "live" | "draft">): boolean =>
  !!s.draft && !snapshotEquals(s.draft, s.live);

/** 派生：人が読める差分一覧。 */
export const settingsDiffList = (s: Pick<SettingsStore, "live" | "draft">): string[] =>
  s.draft ? diffSnapshots(s.live, s.draft) : [];

/** 表示用：編集中ドラフトがあればそれ、なければ live。 */
export const currentSnapshot = (s: Pick<SettingsStore, "live" | "draft">): SettingsSnapshot =>
  s.draft ?? s.live;
