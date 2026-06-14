import { useEffect } from "react";
import { useStore } from "../../store";

/** アクション付きトースト通知。ストアの toast 状態を購読して描画。 */
export function Toast() {
  const toast = useStore((s) => s.toast);
  const clearToast = useStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.action ? 6000 : 2600;
    const t = setTimeout(clearToast, ms);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;
  return (
    <div className="toast" role="status">
      <span>{toast.msg}</span>
      {toast.action && (
        <button
          className="toast-btn"
          onClick={() => {
            const fn = toast.action!.fn;
            clearToast();
            fn();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
