import { create } from "zustand";
import type { VehicleMaster } from "../domain/types";
import { seedVehicleMasters } from "../domain/masterSeed";

/** 編集フォームの入力値（保存前の作業用）。 */
export interface MasterForm {
  no: number | null; // null=新規
  plate: string;
  chassis: string;
  code: string;
  name: string;
  note: string;
  office: string;
  maxLoad: number | "";
  grossWeight: number | "";
  size: string;
  klass: string;
}

const seeded = seedVehicleMasters();

interface MasterStore {
  vehicles: VehicleMaster[];
  /** 車番重複チェック（自分自身=no は除外）。 */
  isPlateTaken: (plate: string, exceptNo: number | null) => boolean;
  /** 新規追加または既存更新。 */
  upsert: (form: MasterForm) => void;
  remove: (no: number) => void;
}

let _seq = seeded.length; // 車両ID採番の継続
const nextVehicleId = () => "veh_" + String(++_seq).padStart(4, "0");
const nextNo = (vs: VehicleMaster[]) => vs.reduce((m, v) => Math.max(m, v.no), 1000) + 1;

export const useMasterStore = create<MasterStore>((set, get) => ({
  vehicles: seeded,

  isPlateTaken: (plate, exceptNo) =>
    get().vehicles.some((v) => v.plate === plate.trim() && v.no !== exceptNo),

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
        const v: VehicleMaster = { no: nextNo(s.vehicles), id: nextVehicleId(), ...fields };
        return { vehicles: [...s.vehicles, v] };
      }
      return {
        vehicles: s.vehicles.map((v) => (v.no === form.no ? { ...v, ...fields } : v)),
      };
    }),

  remove: (no) => set((s) => ({ vehicles: s.vehicles.filter((v) => v.no !== no) })),
}));
