import { useStore, type View } from "../store";

const CRUMB: Record<View, string> = {
  documents: "書類一覧",
  vehicles: "コストモニター",
  master: "マスタデータ",
  settings: "設定",
};

const COMPANY = "サンプル物流株式会社";
const USER = "諏訪 尚杜";

export function Topbar() {
  const view = useStore((s) => s.view);
  const initial = USER.trim().charAt(0);
  return (
    <header className="topbar">
      <div className="crumb">
        {COMPANY} <span style={{ margin: "0 6px", color: "var(--inkFaint)" }}>/</span> <b>{CRUMB[view]}</b>
      </div>
      <div className="who">
        <span>{USER}</span>
        <span className="avatar" aria-hidden="true">
          {initial}
        </span>
      </div>
    </header>
  );
}
