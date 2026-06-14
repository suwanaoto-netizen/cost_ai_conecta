import { useStore } from "../store";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { OverlayHost } from "./common/OverlayHost";
import { Toast } from "./common/Toast";
import { Placeholder } from "./views/Placeholder";

const VIEW_META = {
  documents: { title: "書類一覧", desc: "取り込んだ請求書の確認・編集・データ連携を行います。" },
  vehicles: { title: "コストモニター", desc: "車両（車番）単位のコストを自動集計・可視化します。" },
  master: { title: "マスタデータ", desc: "車両の登録・編集。突合の真実源です。" },
  settings: { title: "設定", desc: "データ化・突合・データ連携・表示などの設定。" },
} as const;

export function AppShell() {
  const view = useStore((s) => s.view);
  const meta = VIEW_META[view];

  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <Topbar />
        <main className="content">
          <Placeholder title={meta.title} desc={meta.desc} />
        </main>
      </div>
      <OverlayHost />
      <Toast />
    </div>
  );
}
