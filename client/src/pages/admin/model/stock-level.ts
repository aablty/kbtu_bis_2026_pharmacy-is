export type StockLevel = "out" | "very-low" | "low";

/** out: nothing left; very-low: at most a third of the reorder threshold; low: at or below the threshold. */
export function stockLevel(stock: number, threshold: number): StockLevel {
  if (stock <= 0) return "out";
  if (stock * 3 <= threshold) return "very-low";
  return "low";
}
