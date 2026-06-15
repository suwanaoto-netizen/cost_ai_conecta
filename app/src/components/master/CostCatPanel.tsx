import { useRef } from "react";
import { useMasterStore } from "../../store/master";
import { nextOverlayId, useStore } from "../../store";
import { DOC_TYPES } from "../../domain/settings";
import { subcatsOf } from "../../domain/costCats";
import { CatPill } from "../common/CatPill";
import { Button } from "../common/Button";
import { IconAlert } from "../common/Icon";

/** コスト分類の削除確認（連携済みデータへの影響を警告）。 */
function CostCatDeleteConfirm({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <>
      <div className="m-body">
        <div className="ce-warn">
          <IconAlert color="#B87514" size={18} />
          <div>
            <div className="ce-q">コスト分類「{name}」を削除しますか？</div>
            <div className="ce-note">
              連携済み（凍結）の明細にこの分類が残っている場合、表示は既定色にフォールバックします。
              新しい明細でこの分類は選べなくなります。
            </div>
          </div>
        </div>
      </div>
      <div className="m-foot">
        <Button variant="cancel" onClick={onCancel}>
          キャンセル
        </Button>
        <Button variant="green" onClick={onConfirm}>
          削除する
        </Button>
      </div>
    </>
  );
}

export function CostCatPanel() {
  const costCats = useMasterStore((s) => s.costCats);
  const addCostCat = useMasterStore((s) => s.addCostCat);
  const removeCostCat = useMasterStore((s) => s.removeCostCat);
  const toggleCatDocType = useMasterStore((s) => s.toggleCatDocType);
  const pushOverlay = useStore((s) => s.pushOverlay);
  const showToast = useStore((s) => s.showToast);
  const catRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const v = catRef.current?.value ?? "";
    if (!v.trim()) return showToast("分類名を入力してください");
    if (!addCostCat(v)) return showToast("すでに存在します");
    if (catRef.current) catRef.current.value = "";
    showToast("コスト分類を追加しました");
  };

  const askRemove = (name: string) => {
    const id = nextOverlayId();
    pushOverlay({
      id,
      title: "コスト分類を削除",
      width: 480,
      render: (close) => (
        <CostCatDeleteConfirm
          name={name}
          onCancel={close}
          onConfirm={() => {
            removeCostCat(name);
            close();
            showToast("コスト分類を削除しました");
          }}
        />
      ),
    });
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>コスト分類</h1>
          <p>
            明細のコスト分類（コスト構造）のマスタです。分類ごとに <b>想定書類タイプ</b>（書類タイプのヒント・コストモニター内訳集計に使用）を紐付けます。
            <b>連携用の内訳コード</b>は外部サービス連携の契約キーのため、参照のみ（システム側で固定）です。
          </p>
        </div>
        <div className="set-add" style={{ marginLeft: "auto" }}>
          <input
            ref={catRef}
            className="in"
            placeholder="新しい分類名（例：洗車費）"
            style={{ maxWidth: 220 }}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button variant="green" onClick={add}>
            分類を追加
          </Button>
        </div>
      </div>

      <div className="ccat-card">
        {costCats.map((c) => {
          const subs = subcatsOf(c.name);
          return (
            <div className="ccat-row" key={c.name}>
              <div className="ccat-head">
                <CatPill cat={c.name} />
              </div>
              <div className="ccat-body">
                <div className="ccat-field">
                  <span className="ccat-lab">想定書類タイプ</span>
                  {DOC_TYPES.map((t) => {
                    const on = c.docTypes.includes(t);
                    return (
                      <span
                        key={t}
                        className={`dt-chip ${on ? "on" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleCatDocType(c.name, t)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleCatDocType(c.name, t)}
                      >
                        {t}
                      </span>
                    );
                  })}
                </div>
                <div className="ccat-field">
                  <span className="ccat-lab">内訳（連携コード）</span>
                  {subs.length ? (
                    subs.map((s) => (
                      <span className="ccat-sub" key={s.code} title={`連携コード: ${s.code}`}>
                        <span className="mono">{s.code}</span>
                        {s.label}
                      </span>
                    ))
                  ) : (
                    <span className="ccat-empty">内訳なし（連携コードを持たない分類）</span>
                  )}
                </div>
              </div>
              <button className="cat-del" title="分類を削除" onClick={() => askRemove(c.name)}>
                ×
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
