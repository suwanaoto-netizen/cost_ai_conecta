import { normPlate } from "./match";

/**
 * 車両集計キーの意味表現（判別共用体）。
 * 従来 "U:正規化plate" / "未設定" のマジック文字列で表していたものを型で表す。
 * 集計の Map キーや永続化（ManualLine.vkey / ChangelogEntry.vehKey）には
 * encodeVehKey の文字列を用い、分岐が要る箇所は parseVehKey で復号する。
 */
export type VehKey =
  | { kind: "master"; id: string } // 登録車両（不変の車両ID veh_xxxx）
  | { kind: "unregistered"; plate: string } // 未登録（正規化車番で暫定集計）
  | { kind: "unset" }; // 車番なし

const UNREG_PREFIX = "U:";
/** 車番なし明細の集計キー。 */
export const UNSET_KEY = "未設定";

/** VehKey を集計・永続化で使う文字列キーへ符号化する。 */
export function encodeVehKey(k: VehKey): string {
  switch (k.kind) {
    case "master":
      return k.id;
    case "unregistered":
      return UNREG_PREFIX + k.plate;
    case "unset":
      return UNSET_KEY;
  }
}

/** 文字列キーを VehKey へ復号する（encodeVehKey の逆）。 */
export function parseVehKey(key: string): VehKey {
  if (key === UNSET_KEY) return { kind: "unset" };
  if (key.startsWith(UNREG_PREFIX)) return { kind: "unregistered", plate: key.slice(UNREG_PREFIX.length) };
  return { kind: "master", id: key };
}

/** 明細の車両ID・車番から集計キー（VehKey）を決める。 */
export function vehKeyOf(vehicleId: string | null | undefined, plate: string): VehKey {
  if (vehicleId) return { kind: "master", id: vehicleId };
  const np = normPlate(plate);
  return np ? { kind: "unregistered", plate: np } : { kind: "unset" };
}
