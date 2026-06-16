import { useEffect, useRef, useState } from "react";
import { useStore, type View, nextOverlayId } from "../store";
import { useSettingsStore } from "../store/settings";
import { useDataStore } from "../store/data";
import { useVehicles, usePlateIndex } from "../store/selectors";
import { plateRegistered } from "../domain/match";
import type { Alert } from "../domain/alerts";
import { VehKarteModal } from "./costmonitor/VehKarteModal";
import { IconBell, IconX } from "./common/Icon";

const CRUMB: Record<View, string> = {
  documents: "書類一覧",
  vehicles: "コストモニター",
  master: "マスタデータ",
  settings: "設定",
};

const USER = "諏訪 尚杜";

export function Topbar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const pushOverlay = useStore((s) => s.pushOverlay);
  const setPickupHighlight = useStore((s) => s.setPickupHighlight);
  const showToast = useStore((s) => s.showToast);
  const COMPANY = useSettingsStore((s) => s.live.settings.companyName);

  const alerts = useDataStore((s) => s.alerts);
  const seenAlertIds = useDataStore((s) => s.seenAlertIds);
  const markAlertsSeen = useDataStore((s) => s.markAlertsSeen);
  const vehicles = useVehicles("all", null);
  const plateIndex = usePlateIndex();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hasUnseen = alerts.some((a) => !seenAlertIds[a.id]);
  const initial = USER.trim().charAt(0);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) markAlertsSeen(); // 開いた時点で既読化＝赤ポチ消灯
  };

  const dispatch = (a: Alert) => {
    setOpen(false);
    if (a.target.type === "veh_karte") {
      const v = vehicles.find((x) => x.key === a.target.vehKey);
      if (!v) { showToast("対象の車両が見つかりませんでした"); return; }
      pushOverlay({
        id: nextOverlayId(),
        title: "車両カルテ",
        width: 680,
        render: (close) => <VehKarteModal vehicle={v} isMaster={plateRegistered(plateIndex, v.target)} onClose={close} />,
      });
    } else if (a.target.type === "pickup" && a.target.listId) {
      setView("vehicles");
      setPickupHighlight(a.target.listId);
    }
  };

  return (
    <header className="topbar">
      <div className="crumb">
        {COMPANY} <span style={{ margin: "0 6px", color: "var(--inkFaint)" }}>/</span> <b>{CRUMB[view]}</b>
      </div>
      <div className="who">
        <div className="bell-wrap" ref={wrapRef}>
          <button className="bell" onClick={toggle} aria-label="アラート" aria-expanded={open}>
            <IconBell />
            {hasUnseen && <span className="bell-dot" aria-hidden="true" />}
          </button>
          {open && (
            <div className="bell-pop" role="menu">
              <div className="bp-head">
                <span>アラート</span>
                <button className="x" onClick={() => setOpen(false)}><IconX size={16} /></button>
              </div>
              <div className="bp-list">
                {alerts.length === 0 ? (
                  <div className="bp-empty">新しいアラートはありません</div>
                ) : (
                  alerts.map((a) => (
                    <button className="bp-item" key={a.id} onClick={() => dispatch(a)}>
                      <span className={`bp-dot ${a.kind === "pickup_change" ? "blue" : "red"}`} aria-hidden="true" />
                      <div className="bp-main">
                        <div className="bp-title">{a.title}</div>
                        <div className="bp-detail">{a.detail}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <span>{USER}</span>
        <span className="avatar" aria-hidden="true">{initial}</span>
      </div>
    </header>
  );
}
