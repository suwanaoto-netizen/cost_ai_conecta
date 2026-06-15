import type { Lid } from "./types";

/**
 * 既存の文字列・数値を Lid 型へ正規化する（境界での受け入れ専用）。
 * 永続化値やテストデータなど、mintLid 以外の経路から来た値に使う。
 */
export const asLid = (v: string | number): Lid => String(v) as Lid;

// 全明細で共有する単調増加カウンタ。シード・アップロード・手動追加が
// 同一カウンタを使うことで、生成元をまたいだ lid 衝突を構造的に排除する。
let _lidSeq = 0;

/** 一意な明細 lid を採番する。 */
export const mintLid = (): Lid => `L${(++_lidSeq).toString(36)}` as Lid;
