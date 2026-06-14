import { useEffect } from "react";
import { useStore } from "../store";
import { useDataStore } from "../store/data";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { OverlayHost } from "./common/OverlayHost";
import { Toast } from "./common/Toast";
import { Placeholder } from "./views/Placeholder";
import { SettingsView } from "./views/SettingsView";
import { MasterView } from "./views/MasterView";
import { CostMonitorView } from "./views/CostMonitorView";

const VIEW_META = {
  documents: { title: "書類一覧", desc: "取り込んだ請求書の確認・編集・データ連携を行います。" },
} as const;

function ViewArea() {
  const view = useStore((s) => s.view);
  if (view === "settings") return <SettingsView />;
  if (view === "master") return <MasterView />;
  if (view === "vehicles") return <CostMonitorView />;
  const meta = VIEW_META[view];
  return <Placeholder title={meta.title} desc={meta.desc} />;
}

export function AppShell() {
  const setTodoCount = useStore((s) => s.setTodoCount);
  const docs = useDataStore((s) => s.docs);
  useEffect(() => {
    setTodoCount(docs.filter((d) => !d.deleted && d.status === "未入力").length);
  }, [docs, setTodoCount]);

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
