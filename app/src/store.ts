import { create } from "zustand";
import type { ReactNode } from "react";

export type View = "documents" | "vehicles" | "master" | "settings";

/** オーバーレイ（モーダル）スタック。最前面のみが操作対象＝フォーカストラップされる。 */
export interface OverlayItem {
  id: string;
  /** モーダル見出し（任意） */
  title?: string;
  /** 本文を描画する関数（クローズ関数を受け取る） */
  render: (close: () => void) => ReactNode;
  /** 幅（px、既定 560） */
  width?: number;
  /** バックドロップ／Esc で閉じるか（既定 true） */
  dismissable?: boolean;
}

export interface ToastAction {
  label: string;
  fn: () => void;
}
export interface ToastState {
  msg: string;
  action?: ToastAction;
}

interface AppState {
  view: View;
  sidebarCollapsed: boolean;
  overlays: OverlayItem[];
  toast: ToastState | null;
  /** 未入力件数バッジ（ドメインデータ移行までは外部から設定） */
  todoCount: number;

  setView: (v: View) => void;
  toggleSidebar: () => void;
  pushOverlay: (o: OverlayItem) => void;
  closeOverlay: (id?: string) => void; // id 省略時は最前面を閉じる
  showToast: (msg: string, action?: ToastAction) => void;
  clearToast: () => void;
  setTodoCount: (n: number) => void;
}

let _ovSeq = 0;
export const nextOverlayId = () => "ov_" + ++_ovSeq;

export const useStore = create<AppState>((set) => ({
  view: "documents",
  sidebarCollapsed: false,
  overlays: [],
  toast: null,
  todoCount: 0,

  setView: (v) => set({ view: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  pushOverlay: (o) => set((s) => ({ overlays: [...s.overlays, o] })),
  closeOverlay: (id) =>
    set((s) => ({
      overlays: id ? s.overlays.filter((o) => o.id !== id) : s.overlays.slice(0, -1),
    })),
  showToast: (msg, action) => set({ toast: { msg, action } }),
  clearToast: () => set({ toast: null }),
  setTodoCount: (n) => set({ todoCount: n }),
}));
