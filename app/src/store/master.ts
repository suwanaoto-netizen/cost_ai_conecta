// 後方互換シム：車両マスタは統合正規化ストア（store/app.ts）へ移行済み。
// 車両配列の読み取りは store/selectors.ts の useVehicleMasters を使うこと。
export { useAppStore as useMasterStore } from "./app";
export type { MasterForm } from "./app";
