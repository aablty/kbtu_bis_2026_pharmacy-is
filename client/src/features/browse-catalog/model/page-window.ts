/** Page numbers to render: first, last, and a window around `page`; "gap" marks skipped runs. */
export function pageWindow(page: number, last: number): (number | "gap")[] {
  const keep = new Set([1, last, page - 1, page, page + 1]);
  const pages = [...keep]
    .filter((n) => n >= 1 && n <= last)
    .sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (const [i, n] of pages.entries()) {
    if (i > 0 && n - pages[i - 1] > 1) out.push("gap");
    out.push(n);
  }
  return out;
}
