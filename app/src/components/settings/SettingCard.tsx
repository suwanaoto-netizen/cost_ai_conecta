import type { ReactNode } from "react";

export function SettingCard({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon?: ReactNode;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="set-card">
      <div className="set-h">
        {icon}
        {title}
        {count != null && <span className="set-count">{count}件</span>}
      </div>
      {children}
    </section>
  );
}

export function SettingRow({
  title,
  desc,
  children,
  rangeMode,
}: {
  title: string;
  desc: string;
  children: ReactNode;
  rangeMode?: boolean;
}) {
  return (
    <div className="set-row">
      <div className="set-l">
        <div className="set-t">{title}</div>
        <div className="set-d">{desc}</div>
      </div>
      <div className={`set-c ${rangeMode ? "set-range" : ""}`}>{children}</div>
    </div>
  );
}
