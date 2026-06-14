import { useStore, type View } from "../store";
import { IconDocs, IconDb, IconTruck, IconGear, IconChevron } from "./common/Icon";

interface NavItem {
  view: View;
  label: string;
  icon: (p: { color?: string; size?: number }) => JSX.Element;
  badge?: number;
}

export function Sidebar() {
  const view = useStore((s) => s.view);
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const todoCount = useStore((s) => s.todoCount);
  const setView = useStore((s) => s.setView);
  const toggleSidebar = useStore((s) => s.toggleSidebar);

  const items: NavItem[] = [
    { view: "documents", label: "書類一覧", icon: IconDocs, badge: todoCount || undefined },
    { view: "vehicles", label: "コストモニター", icon: IconTruck },
    { view: "master", label: "マスタデータ", icon: IconDb },
    { view: "settings", label: "設定", icon: IconGear },
  ];

  return (
    <nav className={`side ${collapsed ? "collapsed" : ""}`} aria-label="メインナビゲーション">
      <div className="brand">
        <div className="mark">
          <IconTruck color="#0E7A4B" size={20} />
        </div>
        <div className="brand-txt">
          <div className="nm">AI Fleet Pilot</div>
          <div className="tag">cost ai conecta</div>
        </div>
      </div>

      <button className="side-toggle" onClick={toggleSidebar} aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}>
        <span className="chev" style={{ display: "flex", transform: collapsed ? "rotate(180deg)" : "none" }}>
          <IconChevron />
        </span>
        <span className="stxt">折りたたむ</span>
      </button>

      <div className="nav">
        <div className="nav-h">メニュー</div>
        {items.map((it) => {
          const Icon = it.icon;
          const active = view === it.view;
          return (
            <button
              key={it.view}
              className={`navbtn ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => setView(it.view)}
              title={it.label}
            >
              <span className="nic">
                <Icon color={active ? "#0E7A4B" : "#D6EFE1"} size={18} />
              </span>
              <span className="lbl">{it.label}</span>
              {it.badge != null && <span className="ct">{it.badge}</span>}
            </button>
          );
        })}
      </div>

      <div className="side-foot">物流事業者向け 請求書データ化＆車両原価可視化</div>
    </nav>
  );
}
