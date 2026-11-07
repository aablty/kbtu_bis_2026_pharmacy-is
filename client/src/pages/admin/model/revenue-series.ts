export interface RevenuePoint {
  date: string;
  total_revenue: string;
}

/** One entry per day for the last `days` days ending at `today` (YYYY-MM-DD), zero where there were no sales. */
export function fillRevenueDays(
  points: RevenuePoint[],
  days: number,
  today: string,
): { date: string; revenue: number }[] {
  const byDate = new Map(points.map((p) => [p.date, Number(p.total_revenue)]));
  const end = new Date(`${today}T00:00:00Z`);
  const series: { date: string; revenue: number }[] = [];
  for (let back = days - 1; back >= 0; back--) {
    const day = new Date(end);
    day.setUTCDate(end.getUTCDate() - back);
    const date = day.toISOString().slice(0, 10);
    series.push({ date, revenue: byDate.get(date) ?? 0 });
  }
  return series;
}
