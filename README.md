# cost ai conecta — AI Fleet Pilot

請求書のデータ化（AI-OCR）と、車両（車番）単位のコスト自動集計・連携を行う物流事業者向け Web アプリ。

## リポジトリ構成

| パス | 内容 | 状態 |
|---|---|---|
| `app/` | **React + TypeScript 版（現行・アクティブ）** | 開発はここ。`npm run dev` / `build` / `test` |
| `docs/PRD.md` | プロダクト要求仕様書 | 仕様の正 |
| `legacy-prototype.html` | 旧 Vanilla JS 単一HTMLプロトタイプ | **参照専用・非推奨（メンテナンス対象外）** |

## 現行アプリ（`app/`）

Vite + React + TypeScript + Zustand + Vitest。詳細は [`app/README.md`](app/README.md)。

```bash
cd app
npm install
npm run dev        # 開発サーバ
npm test           # ドメイン単体テスト
npm run typecheck  # 型チェック
npm run build      # 本番ビルド → app/dist/
```

## 移行について

旧プロトタイプ（`legacy-prototype.html`）は全消し再描画（`render()` による `innerHTML` 差し替え）と、
それに伴うスクロール／フォーカス保存ハック（`_captureScroll` 等）に依存していました。
React 版ではセレクタ購読＋差分更新により、これらのハックは不要となり撤去されています。
ドメインロジック（突合・集計・調整・連携プラン等）は `app/src/domain/` に純関数として移植し、単体テストで固定しています。

連携済み（reflected）の書類・明細は**システム内で書き換え不可**（凍結）であり、修正はコストモニターの調整（adjustment）として追記され、原本は不変に保たれます。
