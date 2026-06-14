import type { VehicleMaster } from "./types";
import { genChassis, lookupJikenkyo, officeFromPlate } from "./jikenkyo";
import { DEFAULT_CATEGORIES } from "./settings";

export const FLEET = [
  "名古屋100あ1234", "名古屋100か5678", "名古屋100か5679", "名古屋130す6677", "名古屋200あ3344",
  "名古屋200か1188", "名古屋330え4567", "名古屋400さ2020", "名古屋500た7788", "名古屋800さ8706",
  "名古屋800た1010", "三河100か2020", "三河800さ9012", "三河800せ3131", "岡崎100か2233",
  "岡崎300す5566", "豊橋800せ4455", "豊橋100か7799", "一宮800そ8899", "一宮200か4422",
  "岐阜100か7890", "岐阜200さ1212", "浜松100か3030", "浜松300た9090", "春日井500あ1212",
  "四日市800か3434", "津100す5656", "知多300か7878",
];

export const NEW_PLATES = new Set([
  "名古屋330え4567", "岐阜100か7890", "浜松100か3030", "春日井500あ1212", "名古屋800た1010", "知多300か7878",
]);

/** プロトタイプ initVehicleMaster と同じ規則で車両マスタの初期データを生成する。 */
export function seedVehicleMasters(): VehicleMaster[] {
  const out: VehicleMaster[] = [];
  let no = 1001;
  let idx = 0;
  let seq = 0;
  FLEET.forEach((p) => {
    if (NEW_PLATES.has(p)) return;
    const chassis = genChassis(p);
    const spec = lookupJikenkyo(chassis);
    out.push({
      no: no++,
      id: "veh_" + String(++seq).padStart(4, "0"),
      plate: p,
      chassis,
      code: `V${String(++idx).padStart(3, "0")}`,
      name: "",
      note: "",
      office: officeFromPlate(p, DEFAULT_CATEGORIES),
      maxLoad: spec ? spec.maxLoad : "",
      grossWeight: spec ? spec.gross : "",
      size: spec ? spec.size : "",
      klass: spec ? spec.klass : "",
    });
  });
  return out;
}
