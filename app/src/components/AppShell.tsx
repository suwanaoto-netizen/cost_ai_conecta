import { useStore } from "../store";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { OverlayHost } from "./common/OverlayHost";
import { Toast } from "./common/Toast";
import { Placeholder } from "./views/Placeholder";
import { SettingsView } from "./views/SettingsView";

const VIEW_META = {
  documents: { title: "書類一覧", desc: "取り込んだ請求書の確認・編集・データ連携を行います。" },
  vehicles: { title: "コストモニター", desc: "車両（車番）単位のコストを自動集計・可視化します。" },
  master: { title: "マスタデータ", desc: "車両の登録・編集。突合の真実源です。" },
} as const;

function ViewArea() {
  const view = useStore((s) => s.view);
  if (view === "settings") return <SettingsView />;
  const meta = VIEW_META[view];
  return <Placeholder title={meta.title} desc={meta.desc} />;
}

export function AppShell() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <Topbar />
        <main className="content">
          <ViewArea />
        </main>
      </div>
      <OverlayHost />
      <Toast />
    </div>
  );
}
