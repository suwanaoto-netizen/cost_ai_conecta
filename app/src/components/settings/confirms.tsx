import { Button } from "../common/Button";
import { IconAlert } from "../common/Icon";

/** 設定保存の確認（差分一覧を提示）。Modal の中身として描画される。 */
export function SettingsSaveConfirm({
  diff,
  onCancel,
  onConfirm,
}: {
  diff: string[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <div className="m-body">
        <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "var(--ink)" }}>
          以下の内容で設定を保存します。保存すると画面全体に反映されます。
        </p>
        <div className="ce-list">
          {diff.length ? (
            diff.map((t, i) => (
              <div className="ce-row changed" key={i}>
                <span className="ce-tag">✎</span>
                <div className="ce-body">{t}</div>
              </div>
            ))
          ) : (
            <div className="ce-empty">変更はありません。</div>
          )}
        </div>
      </div>
      <div className="m-foot">
        <Button variant="cancel" onClick={onCancel}>
          キャンセル
        </Button>
        <Button variant="green" onClick={onConfirm}>
          保存する
        </Button>
      </div>
    </>
  );
}

/** 未保存のまま設定ページを離れる際の確認。 */
export function SettingsLeaveConfirm({
  onStay,
  onDiscard,
}: {
  onStay: () => void;
  onDiscard: () => void;
}) {
  return (
    <>
      <div className="m-body">
        <div className="ce-warn">
          <IconAlert color="#B87514" size={18} />
          <div>
            <div className="ce-q">保存していない変更があります。</div>
            <div className="ce-note">
              このページを離れると編集中の内容は破棄されます。破棄して移動しますか？
            </div>
          </div>
        </div>
      </div>
      <div className="m-foot">
        <Button variant="cancel" onClick={onStay}>
          このページに留まる
        </Button>
        <Button variant="green" onClick={onDiscard}>
          破棄して移動
        </Button>
      </div>
    </>
  );
}
