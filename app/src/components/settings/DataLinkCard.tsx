import { useState } from "react";
import { useSettingsStore, currentSnapshot } from "../../store/settings";
import { useStore } from "../../store";
import type { ExternalFormat } from "../../domain/settings";
import { SettingCard, SettingRow } from "./SettingCard";
import { Switch } from "../common/Switch";
import { Button } from "../common/Button";
import { IconDb } from "../common/Icon";

type Tab = "logipoke" | "mobipoke" | "external";

export function DataLinkCard() {
  const s = useSettingsStore((st) => currentSnapshot(st).settings);
  const setSetting = useSettingsStore((st) => st.setSetting);
  const toggleSetting = useSettingsStore((st) => st.toggleSetting);
  const showToast = useStore((st) => st.showToast);
  const [tab, setTab] = useState<Tab>("logipoke");

  const tabs: [Tab, string, boolean][] = [
    ["logipoke", "ロジポケ連携", s.logipokeEnabled],
    ["mobipoke", "モビポケ連携", s.mobipokeEnabled],
    ["external", "外部サービス連携", s.externalEnabled],
  ];

  return (
    <SettingCard title="データ連携" icon={<IconDb color="#16A571" size={16} />}>
      <div className="set-d" style={{ marginBottom: 12 }}>
        車両コストや運行データの連携先を設定します。ロジポケ・モビポケ・外部サービスをタブで切り替えて設定してください。
      </div>
      <div className="seg" style={{ marginBottom: 14 }}>
        {tabs.map(([k, label, on]) => (
          <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>
            {label}
            {on && <span className="n">ON</span>}
          </button>
        ))}
      </div>

      {tab === "logipoke" && (
        <>
          <SettingRow title="ロジポケ連携を有効にする" desc="車両コスト（車両マスタ）をロジポケへ連携します。">
            <Switch checked={s.logipokeEnabled} onChange={() => toggleSetting("logipokeEnabled")} label="ロジポケ連携" />
          </SettingRow>
          <SettingRow title="連携先エンドポイント" desc="連携先のロジポケAPIのURL。">
            <input className="in mono" style={{ maxWidth: 340 }} value={s.logipokeUrl} onChange={(e) => setSetting("logipokeUrl", e.target.value)} />
          </SettingRow>
          <SettingRow title="APIキー" desc="連携用のシークレットキー。">
            <input className="in mono" style={{ maxWidth: 340 }} value={s.logipokeKey} onChange={(e) => setSetting("logipokeKey", e.target.value)} />
          </SettingRow>
          <SettingRow title="入力済みの書類を自動でデータ連携" desc="保存して入力済みになった書類をロジポケへ自動連携します（プロトタイプでは表示のみ）。">
            <Switch checked={s.autoReflect} onChange={() => toggleSetting("autoReflect")} label="自動データ連携" />
          </SettingRow>
          <SettingRow title="接続テスト" desc="現在の設定でロジポケへの接続を確認します。">
            <Button variant="ghost" onClick={() => showToast("ロジポケへの接続テストに成功しました（ダミー）")}>
              接続をテスト
            </Button>
          </SettingRow>
        </>
      )}

      {tab === "mobipoke" && (
        <>
          <SettingRow title="モビポケ連携を有効にする" desc="運行・車両データをモビポケへ連携します。">
            <Switch checked={s.mobipokeEnabled} onChange={() => toggleSetting("mobipokeEnabled")} label="モビポケ連携" />
          </SettingRow>
          <SettingRow title="連携先エンドポイント" desc="連携先のモビポケAPIのURL。">
            <input className="in mono" style={{ maxWidth: 340 }} value={s.mobipokeUrl} onChange={(e) => setSetting("mobipokeUrl", e.target.value)} />
          </SettingRow>
          <SettingRow title="APIキー" desc="連携用のシークレットキー。">
            <input className="in mono" style={{ maxWidth: 340 }} value={s.mobipokeKey} onChange={(e) => setSetting("mobipokeKey", e.target.value)} />
          </SettingRow>
          <SettingRow title="入力済みの書類を自動でデータ連携" desc="保存して入力済みになった書類をモビポケへ自動連携します（プロトタイプでは表示のみ）。">
            <Switch checked={s.mobipokeAuto} onChange={() => toggleSetting("mobipokeAuto")} label="自動データ連携" />
          </SettingRow>
          <SettingRow title="接続テスト" desc="現在の設定でモビポケへの接続を確認します。">
            <Button variant="ghost" onClick={() => showToast("モビポケへの接続テストに成功しました（ダミー）")}>
              接続をテスト
            </Button>
          </SettingRow>
        </>
      )}

      {tab === "external" && (
        <>
          <SettingRow title="外部サービス連携を有効にする" desc="任意のWebhook／APIへ連携データを送信します。">
            <Switch checked={s.externalEnabled} onChange={() => toggleSetting("externalEnabled")} label="外部サービス連携" />
          </SettingRow>
          <SettingRow title="サービス名" desc="連携先サービスの表示名。">
            <input className="in" style={{ maxWidth: 300 }} value={s.externalName} onChange={(e) => setSetting("externalName", e.target.value)} />
          </SettingRow>
          <SettingRow title="連携先エンドポイント" desc="連携データの送信先URL（Webhook）。">
            <input className="in mono" style={{ maxWidth: 340 }} value={s.externalUrl} onChange={(e) => setSetting("externalUrl", e.target.value)} />
          </SettingRow>
          <SettingRow title="APIキー" desc="認証用のシークレットキー。">
            <input className="in mono" style={{ maxWidth: 340 }} value={s.externalKey} onChange={(e) => setSetting("externalKey", e.target.value)} />
          </SettingRow>
          <SettingRow title="送信フォーマット" desc="連携データの形式。">
            <select
              className="in"
              style={{ maxWidth: 160 }}
              value={s.externalFormat}
              onChange={(e) => setSetting("externalFormat", e.target.value as ExternalFormat)}
            >
              {(["json", "csv", "xml"] as ExternalFormat[]).map((f) => (
                <option key={f} value={f}>
                  {f.toUpperCase()}
                </option>
              ))}
            </select>
          </SettingRow>
          <SettingRow title="接続テスト" desc="現在の設定で外部サービスへの接続を確認します。">
            <Button variant="ghost" onClick={() => showToast(`${s.externalName || "外部サービス"}への接続テストに成功しました（ダミー）`)}>
              接続をテスト
            </Button>
          </SettingRow>
        </>
      )}
    </SettingCard>
  );
}
