import { create } from "zustand";
import {
  diffSnapshots,
  freshSnapshot,
  snapshotEquals,
  type Settings,
  type SettingsSnapshot,
} from "../domain/settings";

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

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

export const useSettingsStore = create<SettingsStore>((set, get) => {
  // ドラフトを必ず用意してから patch を当てる共通ヘルパ
  const mutate = (fn: (d: SettingsSnapshot) => void) =>
    set((s) => {
      const d = clone(s.draft ?? s.live);
      fn(d);
      return { draft: d };
    });

  return {
    live: freshSnapshot(),
    draft: null,

    ensureDraft: () => {
      const cur = get().draft;
      if (cur) return cur;
      const d = clone(get().live);
      set({ draft: d });
      return d;
    },
    setSetting: (k, v) => mutate((d) => { d.settings[k] = v; }),
    toggleSetting: (k) => mutate((d) => { d.settings[k] = !d.settings[k]; }),
    setMatchThreshold: (pct) =>
      mutate((d) => { d.settings.matchThreshold = Math.max(0.5, Math.min(0.99, pct / 100)); }),
    setDefaultPageSize: (n) => mutate((d) => { d.settings.defaultPageSize = n; }),
    addCategory: (name) => {
      const t = name.trim();
      if (!t) return false;
      if ((get().draft ?? get().live).categories.includes(t)) return false;
      mutate((d) => { d.categories.push(t); });
      return true;
    },
    removeCategory: (name) => mutate((d) => { d.categories = d.categories.filter((c) => c !== name); }),
    addCat: (name) => {
      const t = name.trim();
      if (!t) return false;
      if ((get().draft ?? get().live).cats.includes(t)) return false;
      mutate((d) => {
        d.cats.push(t);
        if (!d.catDocTypes[t]) d.catDocTypes[t] = ["請求書"];
      });
      return true;
    },
    removeCat: (name) =>
      mutate((d) => {
        d.cats = d.cats.filter((c) => c !== name);
        delete d.catDocTypes[name];
      }),
    toggleCatDocType: (cat, dtype) =>
      mutate((d) => {
        const arr = d.catDocTypes[cat] ?? (d.catDocTypes[cat] = []);
        const i = arr.indexOf(dtype);
        if (i >= 0) arr.splice(i, 1);
        else arr.push(dtype);
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
