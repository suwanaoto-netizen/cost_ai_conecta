import { useStore } from "../../store";
import { Modal } from "./Modal";

/** オーバーレイスタックを描画。最前面のみ操作・フォーカストラップ対象（⑤）。 */
export function OverlayHost() {
  const overlays = useStore((s) => s.overlays);
  const closeOverlay = useStore((s) => s.closeOverlay);

  return (
    <>
      {overlays.map((o, i) => {
        const isTop = i === overlays.length - 1;
        const close = () => closeOverlay(o.id);
        return (
          <Modal
            key={o.id}
            title={o.title}
            width={o.width}
            dismissable={o.dismissable ?? true}
            onClose={close}
            isTop={isTop}
          >
            {o.render(close)}
          </Modal>
        );
      })}
    </>
  );
}
