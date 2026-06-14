import { nextOverlayId, useStore, type View } from "./store";
import { settingsIsDirty, useSettingsStore } from "./store/settings";
import { SettingsLeaveConfirm } from "./components/settings/confirms";

/**
 * ビュー遷移ガード：設定ページに未保存変更がある状態で離脱しようとすると、
 * 離脱確認モーダル（overlayStack）を挟む。
 */
export function navigateGuarded(target: View) {
  const app = useStore.getState();
  const settings = useSettingsStore.getState();
  if (app.view === "settings" && target !== "settings" && settingsIsDirty(settings)) {
    const id = nextOverlayId();
    app.pushOverlay({
      id,
      title: "保存されていない変更があります",
      width: 480,
      render: (close) => (
        <SettingsLeaveConfirm
          onStay={close}
          onDiscard={() => {
            useSettingsStore.getState().discard();
            close();
            useStore.getState().setView(target);
          }}
        />
      ),
    });
    return;
  }
  app.setView(target);
}
