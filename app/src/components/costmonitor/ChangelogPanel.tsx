import { useEffect } from "react";
import { useDataStore } from "../../store/data";
import type { ChangelogEntry } from "../../domain/types";
import { CatPill } from "../common/CatPill";
import { IconX } from "../common/Icon";

const ACT_CLASS: Record<ChangelogEntry["action"], string> = {
  変更: "changed",
  追加: "added",
  削除: "removed",
  ゴミ箱: "removed",
  復元: "added",
};

/** 変更履歴の右スライドパネル。 */
export function ChangelogPanel({ onClose }: { onClose: () => void }) {
  const changelog = useDataStore((s) => s.changelog);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const list = changelog.map((e, i) => ({ e, i })).sort((a, b) => (a.e.ts < b.e.ts ? 1 : -1));

  return (
    <div className="panel-ovl" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="clog" role="dialog" aria-modal="true" aria-label="変更履歴">
        <div className="clog-head">
          <span className="t">変更履歴</span>
          <span className="set-count">{changelog.length}件</span>
          <button className="x" aria-label="閉じる" onClick={onClose}>
            <IconX />
          </button>
        </div>
        <div className="clog-body">
          <div className="clog-note">コスト内訳の編集内容を新しい順に記録しています。</div>
          {list.length === 0 ? (
            <div className="empty">
              <div className="es">まだ変更履歴はありません。</div>
            </div>
          ) : (
            list.map(({ e, i }) => (
              <div className="clog-item" key={i}>
                <div className="clog-top">
                  <span className={`clog-act ${ACT_CLASS[e.action]}`}>{e.action}</span>
                  <span className="clog-ts">{e.ts}</span>
                </div>
                {e.vehTrash ? (
                  <>
                    <div className="clog-main">{e.detail}</div>
                    <div className="clog-foot">
                      <span>{e.user}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="clog-main">
                      <span className="clog-plate">{e.vehTarget}</span>の「{e.item}」を {e.detail}
                    </div>
                    <div className="clog-foot">
                      <span>{e.user}</span>
                      {e.cat && <CatPill cat={e.cat} />}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
