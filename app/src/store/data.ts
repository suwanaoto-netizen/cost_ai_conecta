// 後方互換シム：data / master を統合した正規化ストア（store/app.ts）へ委譲する。
// 配列での読み取りは store/selectors.ts のメモ化フックを使うこと。
export {
  useAppStore,
  useAppStore as useDataStore,
  CURRENT_USER,
  nowStamp,
} from "./app";
export type { DocLineEdit, VehEditCommit, DocPatch, UploadEntry, VehicleRemoveResult } from "./app";
