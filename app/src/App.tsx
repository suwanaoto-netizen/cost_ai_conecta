/**
 * AppShell プレースホルダ。
 * 本格的なビュー（書類一覧 / コストモニター / マスタ / 設定）は段階移行で順次実装する。
 * 現段階（手順1・2）はビルド足場とドメインロジック移植＋テストが目的。
 */
export function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1>AI Fleet Pilot</h1>
      <p>React/TypeScript 再実装の足場です。ドメインロジックは <code>src/domain</code> に移植済み。</p>
      <p>プロトタイプ（Vanilla JS）は <code>../index.html</code> を参照してください。</p>
    </main>
  );
}
