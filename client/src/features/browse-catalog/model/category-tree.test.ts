import { describe, expect, it } from "vitest";
import { ancestorIds, buildCategoryTree, categoryLabel } from "./category-tree";

describe("buildCategoryTree", () => {
  it("nests children under their parent and keeps roots at the top", () => {
    const tree = buildCategoryTree([
      { category_id: 2, name: "Pain", name_ru: null, parent_id: 1 },
      { category_id: 1, name: "Analgesics", name_ru: null, parent_id: null },
      { category_id: 3, name: "Cold", name_ru: "Простуда", parent_id: null },
    ]);

    expect(tree.map((n) => n.name)).toEqual(["Analgesics", "Cold"]);
    expect(tree[0].children.map((n) => n.name)).toEqual(["Pain"]);
    expect(tree[1].children).toEqual([]);
  });
});

describe("ancestorIds / categoryLabel", () => {
  const tree = buildCategoryTree([
    { category_id: 1, name: "A", name_ru: "А", parent_id: null },
    { category_id: 2, name: "B", name_ru: null, parent_id: 1 },
    { category_id: 3, name: "C", name_ru: null, parent_id: 2 },
  ]);
  it("lists ancestors root-first", () => {
    expect(ancestorIds(tree, 3)).toEqual([1, 2]);
    expect(ancestorIds(tree, 1)).toEqual([]);
    expect(ancestorIds(tree, null)).toEqual([]);
  });
  it("prefers the Russian name only for ru with a translation", () => {
    expect(categoryLabel(tree[0], "ru-RU")).toBe("А");
    expect(categoryLabel(tree[0], "en")).toBe("A");
    expect(categoryLabel(tree[0].children[0], "ru")).toBe("B");
  });
});
