import { describe, it, expect } from "vitest";
import { diffSnapshots, freshSnapshot, snapshotEquals } from "./settings";

describe("settings snapshot diff / equals", () => {
  it("無変更なら equals=true / diff=空", () => {
    const a = freshSnapshot();
    const b = freshSnapshot();
    expect(snapshotEquals(a, b)).toBe(true);
    expect(diffSnapshots(a, b)).toEqual([]);
  });

  it("スカラー値の変更を人が読める差分にする", () => {
    const live = freshSnapshot();
    const draft = freshSnapshot();
    draft.settings.companyName = "新会社";
    draft.settings.matchThreshold = 0.7;
    draft.settings.defaultOcr = false;
    expect(snapshotEquals(live, draft)).toBe(false);
    const d = diffSnapshots(live, draft);
    expect(d).toContain("自社名：サンプル物流株式会社 → 新会社");
    expect(d).toContain("突合しきい値：85% → 70%");
    expect(d).toContain("既定でAI-OCRを使う：ON → OFF");
  });

  it("営業所の追加削除を検出", () => {
    const live = freshSnapshot();
    const draft = freshSnapshot();
    draft.categories.push("豊橋営業所");
    draft.categories = draft.categories.filter((c) => c !== "岡崎営業所");
    const d = diffSnapshots(live, draft);
    expect(d).toContain("営業所を追加：豊橋営業所");
    expect(d).toContain("営業所を削除：岡崎営業所");
  });
});
