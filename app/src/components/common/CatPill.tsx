import { catStyleOf } from "../../domain/catStyle";

/** コスト分類ピル。テキストは子ノードとして渡す（文字列連結なし＝XSS構造排除）。 */
export function CatPill({ cat }: { cat: string }) {
  const s = catStyleOf(cat);
  return (
    <span className="catpill" style={{ color: s.fg, background: s.bg }}>
      {cat}
    </span>
  );
}
