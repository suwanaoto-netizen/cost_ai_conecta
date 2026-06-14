import { useState } from "react";
import { useMasterStore, type MasterForm } from "../../store/master";
import { useSettingsStore, currentSnapshot } from "../../store/settings";
import { useStore } from "../../store";
import { fmtKg, lookupJikenkyo } from "../../domain/jikenkyo";
import { Button } from "../common/Button";
import { IconCheck, IconAlert } from "../common/Icon";

const EMPTY: MasterForm = {
  no: null, plate: "", chassis: "", code: "", name: "", note: "", office: "",
  maxLoad: "", grossWeight: "", size: "", klass: "",
};

function KlassBadge({ matched, klass, raw }: { matched: boolean; klass: string; raw: string }) {
  if (matched)
    return (
      <span className="mtag exist">
        <IconCheck color="#157F73" size={11} /> 自検協突合：車格 {klass}
      </span>
    );
  if (raw.trim())
    return (
      <span className="mtag newv">
        <IconAlert color="#B87514" size={11} /> 該当データなし
      </span>
    );
  return null;
}

/** 車両マスタ編集モーダル本体（overlay の中身として描画）。 */
export function MasterEditModal({ initial, onClose }: { initial?: MasterForm; onClose: () => void }) {
  const [form, setForm] = useState<MasterForm>(initial ?? EMPTY);
  const upsert = useMasterStore((s) => s.upsert);
  const remove = useMasterStore((s) => s.remove);
  const isPlateTaken = useMasterStore((s) => s.isPlateTaken);
  const categories = useSettingsStore((s) => currentSnapshot(s).categories);
  const showToast = useStore((s) => s.showToast);

  const isEdit = form.no != null;
  const matched = !!form.klass;

  const set = <K extends keyof MasterForm>(k: K, v: MasterForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  // 車台番号入力 → 自検協突合。React の制御コンポーネントなのでフォーカスは自然に保持される。
  const onChassis = (val: string) => {
    const spec = lookupJikenkyo(val);
    setForm((f) => ({
      ...f,
      chassis: val,
      maxLoad: spec ? spec.maxLoad : "",
      grossWeight: spec ? spec.gross : "",
      size: spec ? spec.size : "",
      klass: spec ? spec.klass : "",
    }));
  };

  const save = () => {
    const plate = form.plate.trim();
    if (!plate) return showToast("車両番号を入力してください");
    if (isPlateTaken(plate, form.no)) return showToast("同じ車両番号がすでに登録されています");
    upsert(form);
    onClose();
    showToast(isEdit ? "車両情報を更新しました" : "車両を登録しました");
  };

  const del = () => {
    if (form.no == null) return;
    remove(form.no);
    onClose();
    showToast("車両を削除しました");
  };

  return (
    <>
      <div className="m-body">
        <div className="fld">
          <label>
            車両番号 <span style={{ color: "var(--alert)" }}>*</span>
          </label>
          <input className="in mono" value={form.plate} onChange={(e) => set("plate", e.target.value)} placeholder="例：名古屋500あ9999" />
        </div>
        <div className="fld">
          <label>
            車台番号（任意）
            <KlassBadge matched={matched} klass={form.klass} raw={form.chassis} />
          </label>
          <input className="in mono" value={form.chassis} onChange={(e) => onChassis(e.target.value)} placeholder="例：2KG-FK71F-590481" />
        </div>
        <div style={{ fontSize: 11, color: "var(--inkSoft)", margin: "-2px 2px 12px", lineHeight: 1.6 }}>
          車台番号を入力すると、自検協データと突合して<b>車格</b>を判定し、最大積載量・車両総重量・サイズを自動で反映します。
        </div>
        <div className="fld">
          <label>車両コード（任意）</label>
          <input className="in" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="例：V001" />
        </div>
        <div className="fld">
          <label>社内名称（任意）</label>
          <input className="in" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="例：1号車" />
        </div>
        <div className="fld">
          <label>営業所（任意）</label>
          <select className="in" value={form.office} onChange={(e) => set("office", e.target.value)}>
            <option value="">（未選択）</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label>備考（任意）</label>
          <textarea className="in" rows={2} style={{ resize: "vertical" }} value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="メモ" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 4 }}>
          <div className="fld">
            <label>最大積載量</label>
            <input className="in" readOnly value={fmtKg(form.maxLoad)} placeholder="自動反映" style={{ background: "#F7F8F5" }} />
          </div>
          <div className="fld">
            <label>車両総重量</label>
            <input className="in" readOnly value={fmtKg(form.grossWeight)} placeholder="自動反映" style={{ background: "#F7F8F5" }} />
          </div>
          <div className="fld">
            <label>サイズ</label>
            <input className="in" readOnly value={form.size} placeholder="自動反映" style={{ background: "#F7F8F5" }} />
          </div>
        </div>
      </div>
      <div className="m-foot">
        {isEdit && (
          <Button variant="cancel" style={{ marginRight: "auto", color: "var(--alert)", borderColor: "#E0B8B2" }} onClick={del}>
            削除
          </Button>
        )}
        <Button variant="cancel" onClick={onClose}>
          キャンセル
        </Button>
        <Button variant="green" onClick={save}>
          <IconCheck color="#fff" size={14} /> 保存する
        </Button>
      </div>
    </>
  );
}
