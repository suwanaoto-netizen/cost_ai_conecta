import type { MatchState } from "../../domain/types";
import { MATCH_META } from "../../domain/catStyle";
import { IconCheck, IconAlert, IconTruck } from "./Icon";

function badgeIcon(state: MatchState) {
  if (state === "existing") return <IconCheck color="#157F73" size={12} />;
  if (state === "new") return <IconTruck color="#B87514" size={12} />;
  if (state === "missing") return <IconAlert color="#5A6472" size={12} />;
  return <IconAlert color="#B23A2E" size={12} />; // suspect / existing-suspect
}

/** 突合バッジ。色のみに依存せずアイコン併記（アクセシビリティ）。 */
export function MatchBadge({ state }: { state: MatchState }) {
  const m = MATCH_META[state];
  return (
    <span className="badge" style={{ color: m.fg, background: m.bg }}>
      {badgeIcon(state)}
      {m.label}
    </span>
  );
}
