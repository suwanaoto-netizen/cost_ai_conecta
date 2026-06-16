import { describe, it, expect } from "vitest";
import { signatureOf, buildReflectedSignatures, linesHaveDuplicate, findDuplicateDocIds } from "./duplicates";
import { asLid } from "./ids";
import type { Document, Line } from "./types";

const line = (lid: number, plate: string, amount: number, date = "2026-04-30", docId?: string): Line => ({
  lid: asLid(lid), item: "軽油", plate, kind: "単車", cat: "燃料費", inspectedAt: date, amount, confidence: 0.97, docId,
});

const doc = (id: string, status: Document["status"], deleted = false): Document => ({
  id, no: 1, name: id, vendor: "v", cat: "請求書", status, category: "", reflectedAt: null, deleted,
});

describe("signatureOf", () => {
  it("車番は正規化（全角→半角・空白除去）して同一視する", () => {
    expect(signatureOf(line(1, "名古屋 100 あ 1234", 1000))).toBe(
      signatureOf(line(2, "名古屋100あ1234", 1000)),
    );
  });
  it("金額・発生日が違えば別署名", () => {
    expect(signatureOf(line(1, "X", 1000))).not.toBe(signatureOf(line(2, "X", 2000)));
    expect(signatureOf(line(1, "X", 1000, "2026-01-01"))).not.toBe(signatureOf(line(2, "X", 1000, "2026-02-02")));
  });
});

describe("buildReflectedSignatures", () => {
  const docs = [doc("r", "連携済み"), doc("e", "入力済み"), doc("t", "連携済み", true)];
  const lines = [
    line(1, "名古屋100あ1234", 30000, "2026-04-30", "r"), // 連携済み → 含む
    line(2, "三河800さ9012", 20000, "2026-04-30", "e"), // 入力済み → 除外
    line(3, "名古屋200か5678", 50000, "2026-04-30", "t"), // 連携済み(ゴミ箱) → 除外
    line(4, "", 9999, "2026-04-30", "r"), // 車番空 → 除外
  ];
  const sig = buildReflectedSignatures(docs, lines);
  it("連携済み（非ゴミ箱）の有効明細のみ署名化する", () => {
    expect(sig.has(signatureOf(line(0, "名古屋100あ1234", 30000)))).toBe(true);
    expect(sig.has(signatureOf(line(0, "三河800さ9012", 20000)))).toBe(false);
    expect(sig.has(signatureOf(line(0, "名古屋200か5678", 50000)))).toBe(false);
    expect(sig.size).toBe(1);
  });
});

describe("linesHaveDuplicate / findDuplicateDocIds", () => {
  const sig = new Set([signatureOf(line(0, "名古屋100あ1234", 30000))]);
  it("車番・金額・発生日が完全一致する明細を1件でも持てば重複", () => {
    expect(linesHaveDuplicate([line(1, "名古屋 100 あ 1234", 30000)], sig)).toBe(true);
    expect(linesHaveDuplicate([line(1, "名古屋100あ1234", 30001)], sig)).toBe(false);
  });
  it("車番が空の明細は重複アンカーにしない", () => {
    expect(linesHaveDuplicate([line(1, "", 30000)], new Set([signatureOf(line(0, "", 30000))]))).toBe(false);
  });
  it("findDuplicateDocIds は重複明細を含む書類IDのみ返す", () => {
    const out = findDuplicateDocIds(
      [
        { id: "a", lines: [line(1, "別ナンバー", 10), line(2, "名古屋100あ1234", 30000)] },
        { id: "b", lines: [line(3, "別ナンバー", 10)] },
      ],
      sig,
    );
    expect(out).toEqual(["a"]);
  });
});
