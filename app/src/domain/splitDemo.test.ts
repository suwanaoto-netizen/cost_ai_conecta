import { describe, it, expect } from "vitest";
import { buildSplitPages, splitGroups } from "./splitDemo";

describe("splitDemo", () => {
  it("既定で3書類（splitAfter 2箇所）に分かれる", () => {
    const pages = buildSplitPages();
    expect(pages).toHaveLength(9);
    expect(splitGroups(pages)).toHaveLength(3);
  });
  it("境界を解除すると書類数が減る", () => {
    const pages = buildSplitPages().map((p, i) => (i === 2 ? { ...p, splitAfter: false } : p));
    expect(splitGroups(pages)).toHaveLength(2);
  });
  it("境界を追加すると書類数が増える", () => {
    const pages = buildSplitPages().map((p, i) => (i === 0 ? { ...p, splitAfter: true } : p));
    expect(splitGroups(pages)).toHaveLength(4);
  });
});
