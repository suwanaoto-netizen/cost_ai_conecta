import { useEffect } from "react";
import { useStore } from "../store";
import { useDataStore } from "../store/data";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { OverlayHost } from "./common/OverlayHost";
import { Toast } from "./common/Toast";
import { SettingsView } from "./views/SettingsView";
import { MasterView } from "./views/MasterView";
import { CostMonitorView } from "./views/CostMonitorView";
import { DocumentsView } from "./views/DocumentsView";

function ViewArea() {
  const view = useStore((s) => s.view);
  if (view === "settings") return <SettingsView />;
  if (view === "master") return <MasterView />;
  if (view === "vehicles") return <CostMonitorView />;
  return <DocumentsView />;
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
