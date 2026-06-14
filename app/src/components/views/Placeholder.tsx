import { nextOverlayId, useStore } from "../../store";
import { Button } from "../common/Button";

/**
 * 移行待ちビューのプレースホルダ。
 * 併せて新アーキテクチャ（オーバーレイスタック＋フォーカストラップ＋トースト）の動作デモを兼ねる。
 * 各ビューの本実装は後続手順で置き換える。
 */
export function Placeholder({ title, desc }: { title: string; desc: string }) {
  const pushOverlay = useStore((s) => s.pushOverlay);
  const showToast = useStore((s) => s.showToast);

  const openDemoModal = () => {
    pushOverlay({
      id: nextOverlayId(),
      title: "共通モーダル（デモ）",
      render: (close) => (
        <>
          <div className="m-body">
            <p style={{ margin: 0, fontSize: 13.5 }}>
              このモーダルは <code>overlayStack</code> 上にあります。Tab はモーダル内に閉じ込められ（フォーカストラップ）、
              Esc / 背景クリックで閉じます。さらに上に重ねることもできます。
            </p>
          </div>
          <div className="m-foot">
            <Button variant="cancel" onClick={close}>
              閉じる
            </Button>
            <Button
              variant="green"
              onClick={() =>
                pushOverlay({
                  id: nextOverlayId(),
                  title: "重ねたモーダル（最前面のみ操作可）",
                  width: 420,
                  render: (close2) => (
                    <>
                      <div className="m-body">
                        <p style={{ margin: 0, fontSize: 13.5 }}>
                          スタックの最前面だけがフォーカストラップ＆Esc の対象です。
                        </p>
                      </div>
                      <div className="m-foot">
                        <Button variant="green" onClick={close2}>
                          OK
                        </Button>
                      </div>
                    </>
                  ),
                })
              }
            >
              さらに重ねる
            </Button>
          </div>
        </>
      ),
    });
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{title}</h1>
          <p>{desc}</p>
        </div>
        <div className="ph-spacer" />
        <Button variant="green" onClick={openDemoModal}>
          モーダルデモ
        </Button>
        <Button variant="ghost" onClick={() => showToast("トースト通知のデモです", { label: "取り消し", fn: () => showToast("取り消しました") })}>
          トーストデモ
        </Button>
      </div>
      <div className="placeholder">
        この画面は React/TypeScript への移行待ちです。共通UI（Button / Chip / StatusChip / MatchBadge /
        Switch / Pager / Modal / Toast）と AppShell・状態管理（Zustand）は実装済みで、ドメインロジックは{" "}
        <code>src/domain</code> に移植・テスト済みです。本ビューの本実装は後続手順で追加します。
      </div>
    </>
  );
}
