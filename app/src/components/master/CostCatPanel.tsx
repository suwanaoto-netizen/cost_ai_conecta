import { useMasterStore } from "../../store/master";
import { DOC_TYPES } from "../../domain/settings";
import { subcatsOf } from "../../domain/costCats";
import { CatPill } from "../common/CatPill";

export function CostCatPanel() {
  const costCats = useMasterStore((s) => s.costCats);
  const toggleCatDocType = useMasterStore((s) => s.toggleCatDocType);

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>コスト分類</h1>
          <p>
            原価区分（コスト構造）のマスタです。分類はシステム固定で、分類ごとに <b>想定書類タイプ</b>（書類タイプのヒント・コストモニター内訳集計に使用）を編集できます。
            <b>連携用の内訳コード</b>は外部サービス連携の契約キーのため、参照のみです。
          </p>
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
            </div>
          );
        })}
      </div>
    </>
  );
}
