import { useMemo, useState } from "react";
import { useDataStore, CURRENT_USER, type DocLineEdit } from "../../store/data";
import { useMasterStore } from "../../store/master";
import { useStore } from "../../store";
import { buildPlateIndex } from "../../domain/match";
import { buildVehicles } from "../../domain/vehicles";
import { yen } from "../../domain/format";
import type { ChangelogEntry, ManualLine } from "../../domain/types";
import { Button } from "../common/Button";

interface Row {
  key: string; // 一意行キー（doc: docId|lid / manual: id）
  src: "doc" | "manual";
  docId?: string;
  lid: string | number;
  item: string;
  cat: string;
  date: string;
  amount: number;
  vendor: string;
}

let _mlSeq = 1;

const CATS = ["燃料費", "修繕・維持費", "通行料", "保険料", "調達コスト", "税金"];

export function VehEditModal({
  vkey,
  kind,
  target,
  office,
  onClose,
}: {
  vkey: string;
  kind: string;
  target: string;
  office: string;
  onClose: () => void;
}) {
  const docs = useDataStore((s) => s.docs);
  const lines = useDataStore((s) => s.lines);
  const manualLines = useDataStore((s) => s.manualLines);
  const adjustments = useDataStore((s) => s.adjustments);
  const commit = useDataStore((s) => s.commitVehicleEdit);
  const masters = useMasterStore((s) => s.vehicles);
  const showToast = useStore((s) => s.showToast);

  // この車両の全明細（期間フィルタ非適用）を実効値で取得
  const initial = useMemo(() => {
    const plateIndex = buildPlateIndex(masters);
    const v = buildVehicles({ docs, lines, manualLines, adjustments, masters, plateIndex }).find((x) => x.key === vkey);
    const rows: Row[] = (v?.lines ?? []).map((l) =>
      l.src === "doc"
        ? { key: `${l.docId}|${l.lid}`, src: "doc", docId: l.docId, lid: l.lid, item: l.item, cat: l.cat, date: l.date, amount: l.amount, vendor: l.vendor }
        : { key: String(l.lid), src: "manual", lid: l.lid, item: l.item, cat: l.cat, date: l.date, amount: l.amount, vendor: l.vendor },
    );
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [rows, setRows] = useState<Row[]>(initial);

  const setField = (key: string, field: keyof Row, value: string | number) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const addManual = () =>
    setRows((rs) => [
      ...rs,
      { key: "new_" + _mlSeq, src: "manual", lid: "new_" + _mlSeq++, item: "新規コスト項目", cat: "修繕・維持費", date: "2026-06-01", amount: 0, vendor: "手動追加" },
    ]);
  const deleteManual = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));

  const total = rows.reduce((s, r) => s + (+r.amount || 0), 0);

  const save = () => {
    const snap = new Map(initial.map((r) => [r.key, r]));
    const changelog: ChangelogEntry[] = [];
    const base = (r: Row): Partial<ChangelogEntry> => ({ vehKey: vkey, kind, vehTarget: target, item: r.item, cat: r.cat, lid: r.lid, docId: r.docId });
    const ts = nowLocal();

    // 追加・変更
    rows.forEach((r) => {
      const s0 = snap.get(r.key);
      if (!s0) {
        changelog.push({ ts, user: CURRENT_USER, action: "追加", detail: `${r.cat}・${yen(r.amount)} を追加`, ...base(r) } as ChangelogEntry);
        return;
      }
      const fields: string[] = [];
      if (r.item !== s0.item) fields.push(`項目を ${s0.item} → ${r.item}`);
      if (r.cat !== s0.cat) fields.push(`コスト分類を ${s0.cat} → ${r.cat}`);
      if (r.date !== s0.date) fields.push(`発生日を ${s0.date} → ${r.date}`);
      if (+r.amount !== +s0.amount) fields.push(`金額を ${yen(s0.amount)} → ${yen(r.amount)}`);
      if (fields.length) changelog.push({ ts, user: CURRENT_USER, action: "変更", detail: fields.join("、"), ...base(r) } as ChangelogEntry);
    });
    // 削除（手動のみ）
    initial.forEach((s0) => {
      if (!rows.find((r) => r.key === s0.key)) {
        changelog.push({ ts, user: CURRENT_USER, action: "削除", detail: `${s0.cat}・${yen(s0.amount)} を削除`, ...base(s0) } as ChangelogEntry);
      }
    });

    const docEdits: DocLineEdit[] = rows
      .filter((r) => r.src === "doc" && r.docId)
      .map((r) => ({ docId: r.docId!, lid: r.lid, item: r.item, cat: r.cat, inspectedAt: r.date, amount: +r.amount || 0 }));

    const manual: ManualLine[] = rows
      .filter((r) => r.src === "manual")
      .map((r) => ({
        id: String(r.lid).startsWith("new_") ? "m" + Date.now() + "_" + _mlSeq++ : String(r.lid),
        vkey, kind, target, item: r.item, cat: r.cat, date: r.date, amount: +r.amount || 0, vendor: r.vendor, office,
      }));

    commit({ vkey, docEdits, manualLines: manual, changelog });
    onClose();
    showToast("コスト内訳を更新しました");
  };

  return (
    <>
      <div className="m-body">
        <div style={{ fontSize: 12.5, color: "var(--inkSoft)", marginBottom: 10 }}>
          連携済み明細の修正は<b>調整</b>として記録され、請求書原本は変更されません（元の値に戻すと調整は消えます）。
        </div>
        <table className="vd-tbl">
          <thead>
            <tr>
              <th style={{ width: 118 }}>発生日</th>
              <th>項目</th>
              <th style={{ width: 126 }}>コスト分類</th>
              <th style={{ width: 130 }}>取引先</th>
              <th className="r" style={{ width: 116 }}>金額</th>
              <th style={{ width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--inkSoft)", padding: 16 }}>
                  明細がありません。下のボタンから追加できます。
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.key} className={r.src === "manual" ? "vd-manual" : ""}>
                  <td>
                    <input className="vd-in mono" value={r.date} onChange={(e) => setField(r.key, "date", e.target.value)} />
                  </td>
                  <td>
                    <input className="vd-in" value={r.item} onChange={(e) => setField(r.key, "item", e.target.value)} />
                  </td>
                  <td>
                    <select className="vd-in" value={r.cat} onChange={(e) => setField(r.key, "cat", e.target.value)}>
                      {CATS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {r.src === "manual" ? (
                      <input className="vd-in" value={r.vendor} onChange={(e) => setField(r.key, "vendor", e.target.value)} />
                    ) : (
                      <span className="vd-src" title={r.vendor}>
                        {r.vendor}
                      </span>
                    )}
                  </td>
                  <td className="r">
                    <input
                      className="vd-in mono ta-r"
                      value={r.amount}
                      onChange={(e) => setField(r.key, "amount", parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {r.src === "manual" ? (
                      <button className="vd-del" title="この明細を削除" onClick={() => deleteManual(r.key)}>
                        ×
                      </button>
                    ) : (
                      <span className="vd-src" title="証憑あり（請求書由来）">
                        証憑
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <button className="vd-add" onClick={addManual}>
          ＋ 明細を追加
        </button>
        <div style={{ textAlign: "right", marginTop: 12, fontWeight: 800 }}>合計 {yen(total)}</div>
      </div>
      <div className="m-foot">
        <Button variant="cancel" onClick={onClose}>
          キャンセル
        </Button>
        <Button variant="green" onClick={save}>
          保存する
        </Button>
      </div>
    </>
  );
}

function nowLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
