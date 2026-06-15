import type { FrozenLine, Line } from "./types";

/**
 * 明細を連携済み（不変）として凍結する。
 * Object.freeze の呼び出しと「凍結＝FrozenLine」という型付けを一箇所に集約し、
 * 連携済み明細の書き換え不可（README の中核不変条件）を担保する。
 */
export const freezeLine = (l: Line): FrozenLine => Object.freeze(l);

/** 明細が凍結済み（連携済み・書き換え不可）かどうか。 */
export const isLineFrozen = (l: Line | FrozenLine): boolean => Object.isFrozen(l);
