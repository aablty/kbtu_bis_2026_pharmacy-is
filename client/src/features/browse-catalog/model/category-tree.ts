import type { Category } from "@/shared/api";

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const nodes = new Map(
    categories.map((c) => [
      c.category_id,
      { ...c, children: [] as CategoryNode[] },
    ]),
  );
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent =
      node.parent_id === null ? undefined : nodes.get(node.parent_id);
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}

/** Ids of every ancestor of `id` (not `id` itself); [] if not found. */
export function ancestorIds(
  nodes: CategoryNode[],
  id: number | null,
): number[] {
  if (id === null) return [];
  for (const node of nodes) {
    if (node.category_id === id) return [];
    const below = ancestorIds(node.children, id);
    if (below.length > 0 || node.children.some((c) => c.category_id === id))
      return [node.category_id, ...below];
  }
  return [];
}

export function categoryLabel(category: Category, language: string): string {
  return language.startsWith("ru") && category.name_ru
    ? category.name_ru
    : category.name;
}
