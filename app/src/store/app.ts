import { create } from "zustand";
import type {
  Adjustment,
  ChangelogEntry,
  DocType,
  Document,
  FrozenLine,
  Lid,
  Line,
  ManualLine,
  Overridable,
  VehicleMaster,
} from "../domain/types";
import { seedDocuments } from "../domain/docSeed";
import { seedVehicleMasters } from "../domain/masterSeed";
import { buildPlateIndex } from "../domain/match";
import { buildVehicles, countReflectedVehicleDocLines } from "../domain/vehicles";
import { yen } from "../domain/format";
import { resolveSubcat } from "../domain/repairSubcat";
import { pruneAdjustments } from "../domain/adjustments";
import { freezeLine } from "../domain/freeze";
import { DEFAULT_COST_CATS, type CostCat } from "../domain/costCats";

export const CURRENT_USER = "諏訪 尚杜";

/** 編集確定時に modal から渡される、明細1行ぶんの編集後の値。 */
export interface DocLineEdit {
  docId: string;
  lid: Lid;
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

/** 車両マスタ編集フォームの入力値（保存前の作業用）。 */
export interface MasterForm {
  no: number | null; // null=新規
  plate: string;
  chassis: string;
  code: string;
  name: string;
  note: string;
  office: string;
  maxLoad: number | null;
  grossWeight: number | null;
  size: string;
  klass: string;
}

/** 車両マスタ削除の結果。ok=false のとき連携済み明細に阻まれている。 */
export interface VehicleRemoveResult {
  ok: boolean;
  blockedByReflected?: number; // 付け替え不可な連携済み明細の件数
  removedManual?: number; // カスケード削除した手動明細の件数
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const rebuildAdj = (arr: Adjustment[]): Record<string, Adjustment> =>
  Object.fromEntries(arr.map((a) => [a.id, a]));

/**
 * 正規化ストア。docs / lines / manualLines / adjustments / 車両マスタを byId で保持し、
 * 参照整合（FK）をミューテーションの中で機械的に保証する。
 * - lines は lid（mintLid で全体一意）で索引し、書類ごとの順序を lineIdsByDoc で保持
 * - 配列が必要な利用側へは store/selectors のメモ化フックから渡す
 */
interface AppStore {
  // 書類（byId + 表示順）
  documents: Record<string, Document>;
  docOrder: string[];
  // 明細（lid 索引 + 書類ごとの順序）
  linesById: Record<string, FrozenLine>;
  lineIdsByDoc: Record<string, string[]>;
  // 手動明細（id 索引）
  manualLinesById: Record<string, ManualLine>;
  // override 調整（id 索引）
  adjustmentsById: Record<string, Adjustment>;
  // 車両マスタ（id 索引 + 表示順）
  vehiclesById: Record<string, VehicleMaster>;
  vehicleOrder: string[];
  // コスト分類マスタ（コスト構造の真実源。車両マスタと同じく即時反映）
  costCats: CostCat[];
  // その他
  changelog: ChangelogEntry[];
  vehTrash: Record<string, true>;
  changelogSeenCount: number;

  // コストモニター
  commitVehicleEdit: (c: VehEditCommit) => void;
  trashVehicle: (entry: ChangelogEntry) => void;
  restoreVehicle: (entry: ChangelogEntry) => void;
  markChangelogSeen: () => void;

  // 書類一覧／詳細パネル
  saveDocDraft: (id: string, patch: DocPatch, lines: readonly Line[]) => void;
  reflectDocDraft: (id: string, patch: DocPatch, lines: readonly Line[]) => void;
  markEntered: (ids: string[]) => void;
  reflectMany: (ids: string[]) => void;
  changeOffice: (ids: string[], office: string) => void;
  setDeleted: (ids: string[], deleted: boolean) => void;
  addDocuments: (entries: UploadEntry[], ocr: boolean, category: string) => void;

  // 車両マスタ
  isPlateTaken: (plate: string, exceptNo: number | null) => boolean;
  upsert: (form: MasterForm) => void;
  remove: (no: number) => VehicleRemoveResult;

  // コスト分類マスタ（分類は固定。想定書類タイプのみ編集可）
  toggleCatDocType: (cat: string, dtype: string) => void;
}

// ---- 初期シードを正規化形へ ----
const { docs: seedDocs, lines: seedLines } = seedDocuments();
const seedVeh = seedVehicleMasters();

const initDocuments: Record<string, Document> = {};
const initDocOrder: string[] = [];
seedDocs.forEach((d) => { initDocuments[d.id] = d; initDocOrder.push(d.id); });

const initLinesById: Record<string, FrozenLine> = {};
const initLineIdsByDoc: Record<string, string[]> = {};
seedLines.forEach((l) => {
  initLinesById[l.lid] = l;
  (initLineIdsByDoc[l.docId!] ??= []).push(l.lid);
});

const initVehiclesById: Record<string, VehicleMaster> = {};
const initVehicleOrder: string[] = [];
seedVeh.forEach((v) => { initVehiclesById[v.id] = v; initVehicleOrder.push(v.id); });

let _vehSeq = seedVeh.length; // 車両ID採番の継続
const nextVehicleId = () => "veh_" + String(++_vehSeq).padStart(4, "0");
const nextNo = (byId: Record<string, VehicleMaster>) =>
  Object.values(byId).reduce((m, v) => Math.max(m, v.no), 1000) + 1;

function seedChangelog(): ChangelogEntry[] {
  const vehicles = buildVehicles({
    docs: seedDocs, lines: seedLines, manualLines: [], adjustments: [],
    masters: seedVeh, plateIndex: buildPlateIndex(seedVeh),
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
      item: l.item, cat: l.cat, lid: String(l.lid), docId: l.docId, detail: t.fn({ cat: l.cat, amount: l.amount, date: l.date }),
    };
  });
}

const initialChangelog = seedChangelog();

/**
 * 書類 docId の明細を next で入れ替えた {linesById, lineIdsByDoc} を返す。
 * 旧明細は索引から除去し、新明細は内訳を再判定（freeze 指定で凍結）。
 */
function replaceDocLines(
  s: AppStore,
  docId: string,
  next: readonly Line[],
  freeze: boolean,
): Pick<AppStore, "linesById" | "lineIdsByDoc"> {
  const linesById = { ...s.linesById };
  (s.lineIdsByDoc[docId] ?? []).forEach((lid) => delete linesById[lid]);
  const ids: string[] = [];
  next.forEach((l) => {
    const c = clone(l);
    c.docId = docId;
    c.subCat = resolveSubcat(c.cat, c.item) ?? null;
    const fl = freeze ? freezeLine(c) : c;
    linesById[fl.lid] = fl;
    ids.push(fl.lid);
  });
  return { linesById, lineIdsByDoc: { ...s.lineIdsByDoc, [docId]: ids } };
}

export const useAppStore = create<AppStore>((set, get) => ({
  documents: initDocuments,
  docOrder: initDocOrder,
  linesById: initLinesById,
  lineIdsByDoc: initLineIdsByDoc,
  manualLinesById: {},
  adjustmentsById: {},
  vehiclesById: initVehiclesById,
  vehicleOrder: initVehicleOrder,
  costCats: DEFAULT_COST_CATS.map((c) => ({ ...c, docTypes: [...c.docTypes] })),
  changelog: initialChangelog,
  vehTrash: {},
  changelogSeenCount: initialChangelog.length,

  commitVehicleEdit: ({ vkey, docEdits, manualLines, changelog }) =>
    set((s) => {
      // doc明細：凍結された元明細（lid で一意参照）と比較して override を再計算
      const edited = new Set(docEdits.map((e) => e.docId + "|" + e.lid));
      const adjustments = Object.values(s.adjustmentsById).filter(
        (a) => !(a.type === "override" && edited.has(a.docId + "|" + a.lid)),
      );
      docEdits.forEach((e) => {
        const orig = s.linesById[e.lid];
        if (!orig || orig.docId !== e.docId) return;
        const patch: Partial<Pick<Line, Overridable>> = {};
        if (String(orig.item ?? "") !== String(e.item)) patch.item = e.item;
        if (String(orig.cat ?? "") !== String(e.cat)) patch.cat = e.cat;
        if (String(orig.inspectedAt ?? "") !== String(e.inspectedAt)) patch.inspectedAt = e.inspectedAt;
        if (+orig.amount !== +e.amount) patch.amount = +e.amount;
        if (Object.keys(patch).length) {
          adjustments.push({ id: "adj" + (adjustments.length + 1) + "_" + e.lid, docId: e.docId, lid: e.lid, type: "override", patch, ts: nowStamp(), user: CURRENT_USER });
        }
      });
      // 手動明細：この車両ぶんを差し替え（他車両はそのまま）
      const manualLinesById: Record<string, ManualLine> = {};
      Object.values(s.manualLinesById).forEach((m) => { if (m.vkey !== vkey) manualLinesById[m.id] = m; });
      manualLines.forEach((m) => { manualLinesById[m.id] = m; });
      return {
        adjustmentsById: rebuildAdj(adjustments),
        manualLinesById,
        changelog: [...s.changelog, ...changelog],
      };
    }),

  trashVehicle: (entry) =>
    set((s) => ({
      vehTrash: { ...s.vehTrash, [entry.vehKey]: true },
      changelog: [...s.changelog, entry],
    })),
  restoreVehicle: (entry) =>
    set((s) => {
      const { [entry.vehKey]: _omit, ...vehTrash } = s.vehTrash;
      return { vehTrash, changelog: [...s.changelog, entry] };
    }),
  markChangelogSeen: () => set((s) => ({ changelogSeenCount: s.changelog.length })),

  saveDocDraft: (id, patch, lines) =>
    set((s) => {
      const d = s.documents[id];
      if (!d) return {};
      const documents = { ...s.documents, [id]: { ...d, ...patch, status: d.status === "未入力" ? "入力済み" : d.status } };
      const adjustments = pruneAdjustments(Object.values(s.adjustmentsById), id, lines.map((l) => l.lid));
      return { documents, ...replaceDocLines(s, id, lines, false), adjustmentsById: rebuildAdj(adjustments) };
    }),

  reflectDocDraft: (id, patch, lines) =>
    set((s) => {
      const d = s.documents[id];
      if (!d) return {};
      const documents = { ...s.documents, [id]: { ...d, ...patch, status: "連携済み" as const, reflectedAt: nowStamp() } };
      const adjustments = pruneAdjustments(Object.values(s.adjustmentsById), id, lines.map((l) => l.lid));
      return { documents, ...replaceDocLines(s, id, lines, true), adjustmentsById: rebuildAdj(adjustments) };
    }),

  markEntered: (ids) =>
    set((s) => {
      const documents = { ...s.documents };
      ids.forEach((id) => {
        const d = documents[id];
        if (d && d.status === "未入力") documents[id] = { ...d, status: "入力済み" };
      });
      return { documents };
    }),

  reflectMany: (ids) =>
    set((s) => {
      const ts = nowStamp();
      const documents = { ...s.documents };
      const linesById = { ...s.linesById };
      ids.forEach((id) => {
        const d = documents[id];
        if (!d || d.status !== "入力済み") return;
        documents[id] = { ...d, status: "連携済み", reflectedAt: ts };
        (s.lineIdsByDoc[id] ?? []).forEach((lid) => {
          const l = linesById[lid];
          if (l && !Object.isFrozen(l)) linesById[lid] = Object.freeze(l);
        });
      });
      return { documents, linesById };
    }),

  changeOffice: (ids, office) =>
    set((s) => {
      const documents = { ...s.documents };
      ids.forEach((id) => {
        const d = documents[id];
        if (d && d.status !== "連携済み") documents[id] = { ...d, category: office };
      });
      return { documents };
    }),

  setDeleted: (ids, deleted) =>
    set((s) => {
      const documents = { ...s.documents };
      ids.forEach((id) => {
        const d = documents[id];
        if (d) documents[id] = { ...d, deleted };
      });
      return { documents };
    }),

  addDocuments: (entries, ocr, category) =>
    set((s) => {
      const documents = { ...s.documents };
      const docOrder = [...s.docOrder];
      const linesById = { ...s.linesById };
      const lineIdsByDoc = { ...s.lineIdsByDoc };
      let no = Object.values(documents).reduce((m, d) => Math.max(m, d.no), 1100) + 1;
      entries.forEach((f, i) => {
        const id = "u" + Date.now() + "_" + i;
        documents[id] = { id, no: no++, name: f.name, vendor: ocr ? f.vendor : "", cat: f.cat, status: "未入力", category: category || "", reflectedAt: null, deleted: false };
        docOrder.push(id);
        const fl = ocr ? f.lines : f.lines.map((l) => ({ ...l, plate: "", vehicleId: null }));
        const ids: string[] = [];
        fl.forEach((l) => { const nl = { ...l, docId: id }; linesById[nl.lid] = nl; ids.push(nl.lid); });
        lineIdsByDoc[id] = ids;
      });
      return { documents, docOrder, linesById, lineIdsByDoc };
    }),

  isPlateTaken: (plate, exceptNo) =>
    Object.values(get().vehiclesById).some((v) => v.plate === plate.trim() && v.no !== exceptNo),

  upsert: (form) =>
    set((s) => {
      const fields = {
        plate: form.plate.trim(),
        chassis: form.chassis.trim(),
        code: form.code.trim(),
        name: form.name.trim(),
        note: form.note.trim(),
        office: form.office,
        maxLoad: form.maxLoad,
        grossWeight: form.grossWeight,
        size: form.size,
        klass: form.klass,
      };
      if (form.no == null) {
        const v: VehicleMaster = { no: nextNo(s.vehiclesById), id: nextVehicleId(), ...fields };
        return { vehiclesById: { ...s.vehiclesById, [v.id]: v }, vehicleOrder: [...s.vehicleOrder, v.id] };
      }
      const vehiclesById = { ...s.vehiclesById };
      const target = Object.values(vehiclesById).find((v) => v.no === form.no);
      if (target) vehiclesById[target.id] = { ...target, ...fields };
      return { vehiclesById };
    }),

  remove: (no) => {
    const s = get();
    const target = Object.values(s.vehiclesById).find((v) => v.no === no);
    if (!target) return { ok: false };
    // FK：連携済み（不変）明細が紐づく車両は付け替え不可なので削除を拒否する。
    const reflected = countReflectedVehicleDocLines(target.id, {
      docs: Object.values(s.documents),
      lines: Object.values(s.linesById),
      plateIndex: buildPlateIndex(Object.values(s.vehiclesById)),
    });
    if (reflected > 0) return { ok: false, blockedByReflected: reflected };
    // 手動明細（編集可能なユーザーデータ）はカスケード削除して整合を保つ。
    const manualLinesById: Record<string, ManualLine> = {};
    let removedManual = 0;
    Object.values(s.manualLinesById).forEach((m) => {
      if (m.vkey === target.id) removedManual++;
      else manualLinesById[m.id] = m;
    });
    const { [target.id]: _drop, ...vehiclesById } = s.vehiclesById;
    set({ vehiclesById, vehicleOrder: s.vehicleOrder.filter((id) => id !== target.id), manualLinesById });
    return { ok: true, removedManual };
  },

  toggleCatDocType: (cat, dtype) =>
    set((s) => ({
      costCats: s.costCats.map((c) => {
        if (c.name !== cat) return c;
        const on = c.docTypes.includes(dtype);
        return { ...c, docTypes: on ? c.docTypes.filter((t) => t !== dtype) : [...c.docTypes, dtype] };
      }),
    })),
}));

export function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
