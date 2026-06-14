/**
 * ドメイン型定義。プロトタイプ index.html の実データ構造（および PRD §2.3）に準拠。
 * 明細(Line)は書類(Document)から独立し docId で参照する（外部キー）。
 */

export type DocStatus = "未入力" | "入力済み" | "連携済み";
export type DocType =
  | "請求書" | "見積書" | "領収書" | "納品書" | "明細書" | "保険証券" | "納付書";

/** 突合状態。existing-suspect = 既存一致だが低信頼度（要確認）。 */
export type MatchState = "existing" | "existing-suspect" | "new" | "suspect" | "missing";

export interface Fuso {
  body: string;
  reefer: string;
  digitacho: boolean;
  drarecorder: boolean;
}

export interface Line {
  lid: number;
  item: string;
  plate: string;
  kind: string; // "単車"
  cat: string; // コスト分類
  inspectedAt: string; // 発生日 "YYYY-MM-DD"
  amount: number;
  confidence: number; // 0..1
  /** 確定時に焼き付ける安定リンク（車両ID）。未確定は未設定。 */
  vehicleId?: string | null;
  docId?: string;
  fuso?: Fuso;
}

export interface Document {
  id: string;
  no: number;
  name: string;
  vendor: string;
  cat: DocType;
  status: DocStatus;
  category: string; // 営業所（空文字＝未選択）
  reflectedAt: string | null;
  deleted: boolean;
}

export interface VehicleMaster {
  no: number;
  /** 不変の内部車両ID（突合・集計の安定キー）。 */
  id: string;
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

export interface ManualLine {
  id: string;
  vkey: string; // 紐付く車両キー（車両ID または "U:正規化plate"）
  kind: string;
  target: string;
  item: string;
  cat: string;
  date: string;
  amount: number;
  vendor: string;
  office: string;
}

/** override 可能な明細フィールド（連携済み明細はこの調整経由でのみ補正する）。 */
export type Overridable = "item" | "cat" | "inspectedAt" | "amount";

export interface Adjustment {
  id: string;
  docId: string;
  lid: string;
  type: "override";
  patch: Partial<Pick<Line, Overridable>>;
  ts: string;
  user: string;
}

export type ChangelogAction = "変更" | "追加" | "削除" | "ゴミ箱" | "復元";

export interface ChangelogEntry {
  ts: string;
  user: string;
  action: ChangelogAction;
  vehKey: string;
  kind: string;
  vehTarget: string;
  item?: string;
  cat?: string;
  lid?: string | number;
  docId?: string;
  vehTrash?: boolean;
  detail: string;
}
