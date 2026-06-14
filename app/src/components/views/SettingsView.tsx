import { useRef } from "react";
import {
  currentSnapshot,
  settingsDiffList,
  settingsIsDirty,
  useSettingsStore,
} from "../../store/settings";
import { nextOverlayId, useStore } from "../../store";
import { navigateGuarded } from "../../nav";
import { DOC_TYPES } from "../../domain/settings";
import { SettingCard, SettingRow } from "../settings/SettingCard";
import { DataLinkCard } from "../settings/DataLinkCard";
import { SettingsSaveConfirm } from "../settings/confirms";
import { Switch } from "../common/Switch";
import { Button } from "../common/Button";
import { CatPill } from "../common/CatPill";
import { IconGear, IconDocs, IconDb, IconTruck, IconAlert, IconCheck } from "../common/Icon";

export function SettingsView() {
  const snap = useSettingsStore(currentSnapshot);
  const dirty = useSettingsStore(settingsIsDirty);
  const st = useSettingsStore();
  const pushOverlay = useStore((s) => s.pushOverlay);
  const showToast = useStore((s) => s.showToast);
  const officeRef = useRef<HTMLInputElement>(null);
  const catRef = useRef<HTMLInputElement>(null);

  const s = snap.settings;
  const pct = Math.round(s.matchThreshold * 100);

  const askSave = () => {
    if (!dirty) return;
    const id = nextOverlayId();
    pushOverlay({
      id,
      title: "設定を保存しますか？",
      width: 520,
      render: (close) => (
        <SettingsSaveConfirm
          diff={settingsDiffList(useSettingsStore.getState())}
          onCancel={close}
          onConfirm={() => {
            useSettingsStore.getState().commit();
            close();
            showToast("設定を保存しました");
          }}
        />
      ),
    });
  };

  const addOffice = () => {
    const v = officeRef.current?.value ?? "";
    if (!v.trim()) return showToast("営業所名を入力してください");
    if (!st.addCategory(v)) return showToast("すでに存在します");
    if (officeRef.current) officeRef.current.value = "";
  };
  const addCat = () => {
    const v = catRef.current?.value ?? "";
    if (!v.trim()) return showToast("分類名を入力してください");
    if (!st.addCat(v)) return showToast("すでに存在します");
    if (catRef.current) catRef.current.value = "";
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>設定</h1>
          <p>
            AI Fleet Pilot のデータ化・突合・データ連携に関する設定です。変更内容は
            <b>保存するまで反映されません</b>。編集後は下部の保存バーから確定してください。
          </p>
        </div>
      </div>

      <div className="settings-wrap">
        <SettingCard title="会社情報" icon={<IconDocs color="#16A571" size={16} />}>
          <SettingRow title="自社名" desc="請求書プレビューの宛名や画面右上に表示されます。">
            <input
              className="in"
              style={{ maxWidth: 300 }}
              value={s.companyName}
              onChange={(e) => st.setSetting("companyName", e.target.value)}
            />
          </SettingRow>
        </SettingCard>

        <SettingCard title="AI-OCR・突合" icon={<IconGear color="#16A571" size={16} />}>
          <SettingRow title="アップロード時に既定でAI-OCRを使う" desc="新規アップロード画面の初期状態を切り替えます。">
            <Switch checked={s.defaultOcr} onChange={() => st.toggleSetting("defaultOcr")} label="既定でAI-OCR" />
          </SettingRow>
          <SettingRow title="突合の信頼度しきい値" desc={`読み取り信頼度がこの値を下回る明細を「要確認」にします（現在 ${pct}%）。`} rangeMode>
            <input
              type="range"
              min={50}
              max={99}
              value={pct}
              onChange={(e) => st.setMatchThreshold(+e.target.value)}
            />
            <span className="mono">{pct}%</span>
          </SettingRow>
        </SettingCard>

        <SettingCard title="表示" icon={<IconDocs color="#16A571" size={16} />}>
          <SettingRow title="1ページあたりの既定表示件数" desc="書類一覧・コストモニターの初期表示件数です。">
            <select
              className="in"
              style={{ maxWidth: 120 }}
              value={s.defaultPageSize}
              onChange={(e) => st.setDefaultPageSize(+e.target.value)}
            >
              {[20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} 件
                </option>
              ))}
            </select>
          </SettingRow>
        </SettingCard>

        <SettingCard title="営業所の管理" icon={<IconDb color="#16A571" size={15} />} count={snap.categories.length}>
          <div className="set-d" style={{ marginBottom: 10 }}>
            書類に紐付く営業所です。ここで登録すると、アップロード・書類詳細で選択でき、書類一覧・コストモニターで絞り込めます。
          </div>
          <div className="set-chips">
            {snap.categories.length ? (
              snap.categories.map((c) => (
                <span className="set-chip" key={c}>
                  {c}
                  <button title="削除" onClick={() => st.removeCategory(c)}>
                    ×
                  </button>
                </span>
              ))
            ) : (
              <span className="set-d">営業所がありません。下から追加してください。</span>
            )}
          </div>
          <div className="set-add">
            <input ref={officeRef} className="in" placeholder="営業所名（例：豊橋営業所）" style={{ maxWidth: 260 }} onKeyDown={(e) => e.key === "Enter" && addOffice()} />
            <Button variant="green" style={{ padding: "8px 14px" }} onClick={addOffice}>
              追加
            </Button>
          </div>
        </SettingCard>

        <SettingCard title="コスト分類と想定書類タイプ" icon={<IconDb color="#16A571" size={15} />}>
          <div className="set-d" style={{ marginBottom: 10 }}>
            明細のコスト分類ごとに、想定される書類タイプを紐付けます（チップをクリックで切替）。コストモニターの内訳集計にも使われます。
          </div>
          <div>
            {snap.cats.map((c) => (
              <div className="cat-row" key={c}>
                <span className="cat-name">
                  <CatPill cat={c} />
                </span>
                <span className="cat-dts">
                  {DOC_TYPES.map((t) => {
                    const on = (snap.catDocTypes[c] ?? []).includes(t);
                    return (
                      <span
                        key={t}
                        className={`dt-chip ${on ? "on" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => st.toggleCatDocType(c, t)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && st.toggleCatDocType(c, t)}
                      >
                        {t}
                      </span>
                    );
                  })}
                </span>
                <button className="cat-del" title="分類を削除" onClick={() => st.removeCat(c)}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="set-add" style={{ marginTop: 12 }}>
            <input ref={catRef} className="in" placeholder="新しい分類名（例：洗車費）" style={{ maxWidth: 260 }} onKeyDown={(e) => e.key === "Enter" && addCat()} />
            <Button variant="green" style={{ padding: "8px 14px" }} onClick={addCat}>
              追加
            </Button>
          </div>
        </SettingCard>

        <DataLinkCard />

        <SettingCard title="車両マスタ" icon={<IconTruck color="#16A571" size={15} />}>
          <div className="set-d">
            車両の登録・編集は <b>「マスタデータ」</b> ページに移動しました。車台番号から車格・諸元の突合も行えます。
          </div>
          <div style={{ marginTop: 12 }}>
            <Button variant="ghost" onClick={() => navigateGuarded("master")}>
              <IconDb color="#0E7A4B" size={15} /> マスタデータを開く
            </Button>
          </div>
        </SettingCard>

        {dirty && (
          <div className="set-savebar">
            <span className="ssb-msg">
              <IconAlert color="#B87514" size={16} /> 未保存の変更があります（{settingsDiffList(st).length}件）
            </span>
            <div className="ssb-actions">
              <Button
                variant="cancel"
                onClick={() => {
                  st.discard();
                  showToast("変更を破棄しました");
                }}
              >
                変更を破棄
              </Button>
              <Button variant="green" onClick={askSave}>
                <IconCheck color="#fff" size={14} /> 保存
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
