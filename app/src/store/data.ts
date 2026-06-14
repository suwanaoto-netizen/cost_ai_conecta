import { create } from "zustand";
import type {
  Adjustment,
  ChangelogEntry,
  DocType,
  Document,
  Line,
  ManualLine,
  Overridable,
} from "../domain/types";
import { seedDocuments } from "../domain/docSeed";
import { seedVehicleMasters } from "../domain/masterSeed";
import { buildPlateIndex } from "../domain/match";
import { buildVehicles } from "../domain/vehicles";
import { yen } from "../domain/format";

export const CURRENT_USER = "諏訪 尚杜";

/** 編集確定時に modal から渡される、明細1行ぶんの編集後の値。 */
export interface DocLineEdit {
  docId: string;
  lid: string | number;
  item: string;
  cat: string;
  inspectedAt: string;
  amount: number;
}

export interface VehEditCommit {
  vkey: string;
  docEdits: DocLineEdit[];
  manualLines: ManualLine[];
  changelog: ChangelogEntry[];
}

export interface DocPatch {
  vendor: string;
  cat: DocType;
  category: string;
}
export interface UploadEntry {
  name: string;
  vendor: string;
  cat: DocType;
  lines: Line[];
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
/** 指定docの明細を入れ替えた新しい lines 配列を返す（freeze 指定で凍結）。 */
function replaceLines(all: Line[], docId: string, next: Line[], freeze: boolean): Line[] {
  const others = all.filter((l) => l.docId !== docId);
  const fresh = next.map((l) => {
    const c = clone(l);
    c.docId = docId;
    return freeze ? Object.freeze(c) : c;
  });
  return [...others, ...fresh];
}

interface DataStore {
  docs: Document[];
  lines: Line[];
  manualLines: ManualLine[];
  adjustments: Adjustment[];
  changelog: ChangelogEntry[];
  vehTrash: Set<string>;
  changelogSeenCount: number;

  commitVehicleEdit: (c: VehEditCommit) => void;
  trashVehicle: (entry: ChangelogEntry) => void;
  restoreVehicle: (entry: ChangelogEntry) => void;
  markChangelogSeen: () => void;

  // 書類一覧／詳細パネル
  saveDocDraft: (id: string, patch: DocPatch, lines: Line[]) => void;
  reflectDocDraft: (id: string, patch: DocPatch, lines: Line[]) => void;
  markEntered: (ids: string[]) => void;
  reflectMany: (ids: string[]) => void;
  changeOffice: (ids: string[], office: string) => void;
  setDeleted: (ids: string[], deleted: boolean) => void;
  addDocuments: (entries: UploadEntry[], ocr: boolean, category: string) => void;
}

const { docs: seedDocs, lines: seedLines } = seedDocuments();

function seedChangelog(): ChangelogEntry[] {
  const masters = seedVehicleMasters();
  const vehicles = buildVehicles({
    docs: seedDocs,
    lines: seedLines,
    manualLines: [],
    adjustments: [],
    masters,
    plateIndex: buildPlateIndex(masters),
  }).filter((v) => v.lines.length);
  if (!vehicles.length) return [];
  const tpl: { ts: string; user: string; action: ChangelogEntry["action"]; fn: (l: { cat: string; amount: number; date: string }) => string }[] = [
    { ts: "2026-06-13 08:51:33", user: "諏訪 尚杜", action: "変更", fn: (l) => `金額を ${yen(l.amount)} → ${yen(Math.round((l.amount * 1.05) / 100) * 100)} に変更` },
    { ts: "2026-06-12 17:20:08", user: "田中 美咲", action: "変更", fn: (l) => `コスト分類を 「その他」→「${l.cat}」に変更` },
    { ts: "2026-06-11 11:03:47", user: "諏訪 尚杜", action: "追加", fn: (l) => `${l.cat}・${yen(Math.round((l.amount * 0.4) / 100) * 100)} を追加` },
    { ts: "2026-06-09 14:38:22", user: "佐藤 健", action: "変更", fn: (l) => `発生日を 2026-05-30 → ${l.date} に修正` },
    { ts: "2026-06-06 10:12:55", user: "田中 美咲", action: "削除", fn: (l) => `重複明細（${yen(l.amount)}）を削除` },
  ];
  return tpl.map((t, i) => {
    const v = vehicles[i % vehicles.length];
    const l = v.lines[0];
    return {
      ts: t.ts, user: t.user, action: t.action, vehKey: v.key, kind: v.kind, vehTarget: v.target,
      item: l.item, cat: l.cat, lid: l.lid, docId: l.docId, detail: t.fn({ cat: l.cat, amount: l.amount, date: l.date }),
    };
  });
}

const initialChangelog = seedChangelog();

export const useDataStore = create<DataStore>((set) => ({
  docs: seedDocs,
  lines: seedLines,
  manualLines: [],
  adjustments: [],
  changelog: initialChangelog,
  vehTrash: new Set(),
  changelogSeenCount: initialChangelog.length,

  commitVehicleEdit: ({ vkey, docEdits, manualLines, changelog }) =>
    set((s) => {
      // doc明細：凍結された元明細と比較して override を再計算（元データは不変）
      const lineByKey = new Map(s.lines.map((l) => [l.docId + "|" + l.lid, l]));
      const edited = new Set(docEdits.map((e) => e.docId + "|" + e.lid));
      const adjustments = s.adjustments.filter(
        (a) => !(a.type === "override" && edited.has(a.docId + "|" + a.lid)),
      );
      docEdits.forEach((e) => {
        const orig = lineByKey.get(e.docId + "|" + e.lid);
        if (!orig) return;
        const patch: Partial<Pick<Line, Overridable>> = {};
        if (String(orig.item ?? "") !== String(e.item)) patch.item = e.item;
        if (String(orig.cat ?? "") !== String(e.cat)) patch.cat = e.cat;
        if (String(orig.inspectedAt ?? "") !== String(e.inspectedAt)) patch.inspectedAt = e.inspectedAt;
        if (+orig.amount !== +e.amount) patch.amount = +e.amount;
        if (Object.keys(patch).length) {
          adjustments.push({ id: "adj" + (adjustments.length + 1) + "_" + e.lid, docId: e.docId, lid: String(e.lid), type: "override", patch, ts: nowStamp(), user: CURRENT_USER });
        }
      });
      // 手動明細：この車両ぶんを差し替え
      const otherManual = s.manualLines.filter((m) => m.vkey !== vkey);
      return {
        adjustments,
        manualLines: [...otherManual, ...manualLines],
        changelog: [...s.changelog, ...changelog],
      };
    }),

  trashVehicle: (entry) =>
    set((s) => {
      const t = new Set(s.vehTrash);
      t.add(entry.vehKey);
      return { vehTrash: t, changelog: [...s.changelog, entry] };
    }),
  restoreVehicle: (entry) =>
    set((s) => {
      const t = new Set(s.vehTrash);
      t.delete(entry.vehKey);
      return { vehTrash: t, changelog: [...s.changelog, entry] };
    }),
  markChangelogSeen: () => set((s) => ({ changelogSeenCount: s.changelog.length })),

  saveDocDraft: (id, patch, lines) =>
    set((s) => ({
      docs: s.docs.map((d) =>
        d.id === id ? { ...d, ...patch, status: d.status === "未入力" ? "入力済み" : d.status } : d,
      ),
      lines: replaceLines(s.lines, id, lines, false),
    })),

  reflectDocDraft: (id, patch, lines) =>
    set((s) => ({
      docs: s.docs.map((d) =>
        d.id === id ? { ...d, ...patch, status: "連携済み", reflectedAt: nowStamp() } : d,
      ),
      lines: replaceLines(s.lines, id, lines, true),
    })),

  markEntered: (ids) =>
    set((s) => {
      const set2 = new Set(ids);
      return { docs: s.docs.map((d) => (set2.has(d.id) && d.status === "未入力" ? { ...d, status: "入力済み" } : d)) };
    }),

  reflectMany: (ids) =>
    set((s) => {
      const set2 = new Set(ids);
      const ts = nowStamp();
      const frozen = new Set<string>();
      const docs = s.docs.map((d) => {
        if (set2.has(d.id) && d.status === "入力済み") {
          frozen.add(d.id);
          return { ...d, status: "連携済み" as const, reflectedAt: ts };
        }
        return d;
      });
      const lines = s.lines.map((l) => (l.docId && frozen.has(l.docId) && !Object.isFrozen(l) ? Object.freeze(l) : l));
      return { docs, lines };
    }),

  changeOffice: (ids, office) =>
    set((s) => {
      const set2 = new Set(ids);
      return { docs: s.docs.map((d) => (set2.has(d.id) && d.status !== "連携済み" ? { ...d, category: office } : d)) };
    }),

  setDeleted: (ids, deleted) =>
    set((s) => {
      const set2 = new Set(ids);
      return { docs: s.docs.map((d) => (set2.has(d.id) ? { ...d, deleted } : d)) };
    }),

  addDocuments: (entries, ocr, category) =>
    set((s) => {
      const newDocs: Document[] = [];
      const newLines: Line[] = [];
      let no = s.docs.reduce((m, d) => Math.max(m, d.no), 1100) + 1;
      entries.forEach((f, i) => {
        const id = "u" + Date.now() + "_" + i;
        newDocs.push({ id, no: no++, name: f.name, vendor: ocr ? f.vendor : "", cat: f.cat, status: "未入力", category: category || "", reflectedAt: null, deleted: false });
        const fl = ocr ? f.lines : f.lines.map((l) => ({ ...l, plate: "", vehicleId: null }));
        fl.forEach((l) => newLines.push({ ...l, docId: id }));
      });
      return { docs: [...s.docs, ...newDocs], lines: [...s.lines, ...newLines] };
    }),
}));

export function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
