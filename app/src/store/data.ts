import { create } from "zustand";
import type {
  Adjustment,
  ChangelogEntry,
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
}));

export function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
