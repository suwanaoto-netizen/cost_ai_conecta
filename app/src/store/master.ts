// 後方互換シム：車両マスタは統合正規化ストア（store/app.ts）へ移行済み。
// 車両配列の読み取りは store/selectors.ts の useVehicleMasters を使うこと。
// コスト分類マスタ（costCats）も app.ts に集約済み（useMasterStore.costCats で参照可）。
export { useAppStore as useMasterStore } from "./app";
export type { MasterForm } from "./app";
