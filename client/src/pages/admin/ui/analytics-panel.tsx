import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatPrice } from "@/features/browse-catalog";
import { analyticsEndpoints } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart";
import { ListEmpty } from "@/shared/ui/list-empty";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { fillRevenueDays } from "../model/revenue-series";
import { stockLevel } from "../model/stock-level";

const RANGES = [7, 30, 90] as const;
const TOP_N = 10;
const LOW_STOCK_PAGE = 5;
const LEVEL_CLASS = {
  out: "border-transparent bg-red-500/15 text-red-600 dark:text-red-400",
  "very-low":
    "border-transparent bg-orange-500/15 text-orange-600 dark:text-orange-400",
  low: "border-transparent bg-yellow-400/25 text-yellow-700 dark:text-yellow-300",
} as const;

const SECTION = "min-w-0 rounded-2xl border p-4 md:p-5";

export function AnalyticsPanel() {
  const { t, i18n } = useTranslation();
  // Chart labels come from the locale, so they are built inside the component.
  const revenueConfig = {
    revenue: { label: t("analytics.totalRevenue"), color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [lowPage, setLowPage] = useState(0);

  const revenue = useQuery({
    queryKey: ["analytics", "revenue", days],
    queryFn: () => analyticsEndpoints.revenue(days),
  });
  const bestSellers = useQuery({
    queryKey: ["analytics", "best-sellers", TOP_N],
    queryFn: () => analyticsEndpoints.bestSellers(TOP_N),
  });
  const lowStock = useQuery({
    queryKey: ["analytics", "low-stock"],
    queryFn: analyticsEndpoints.lowStock,
  });

  const lowItems = lowStock.data ?? [];
  const lowPages = Math.max(1, Math.ceil(lowItems.length / LOW_STOCK_PAGE));
  const lowPageSafe = Math.min(lowPage, lowPages - 1);
  const lowSlice = lowItems.slice(
    lowPageSafe * LOW_STOCK_PAGE,
    (lowPageSafe + 1) * LOW_STOCK_PAGE,
  );

  const sellers = bestSellers.data ?? [];
  const mostSold = Math.max(1, ...sellers.map((s) => s.units_sold));

  const today = new Date().toISOString().slice(0, 10);
  const series = fillRevenueDays(revenue.data?.days ?? [], days, today);
  const compact = new Intl.NumberFormat(i18n.language, { notation: "compact" });

  return (
    <div className="flex min-w-0 flex-col gap-4 md:gap-6">
      {/* Overview: one strip; 1px gaps over a border colour act as dividers. */}
      <section
        aria-label={t("analytics.overview")}
        className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-3"
      >
        <dl className="contents">
          <div className="flex flex-col gap-1 bg-card p-4">
            <dt className="text-xs text-muted-foreground">
              {t("analytics.totalRevenue")}
            </dt>
            <dd className="text-lg font-semibold tabular-nums">
              {revenue.data
                ? formatPrice(revenue.data.total_revenue, i18n.language)
                : "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1 bg-card p-4">
            <dt className="text-xs text-muted-foreground">
              {t("analytics.lowStock")}
            </dt>
            <dd className="text-lg font-semibold tabular-nums">
              {lowStock.data?.length ?? "—"}
            </dd>
          </div>
          <div className="col-span-2 flex min-w-0 flex-col gap-1 bg-card p-4 sm:col-span-1">
            <dt className="text-xs text-muted-foreground">
              {t("analytics.topSeller")}
            </dt>
            <dd className="truncate text-sm font-medium">
              {sellers[0]?.medicine_name ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className={SECTION}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">
              {t("analytics.revenueByDay")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("analytics.revenueCaption", { days })}
            </p>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={String(days)}
            onValueChange={(v) =>
              v && setDays(Number(v) as (typeof RANGES)[number])
            }
            aria-label={t("analytics.range")}
          >
            {RANGES.map((r) => (
              <ToggleGroupItem key={r} value={String(r)}>
                {t("analytics.days", { count: r })}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <ChartContainer config={revenueConfig} className="h-52 w-full md:h-64">
          <AreaChart data={series} margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: string) => v.slice(5)}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => compact.format(v)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="revenue"
              type="monotone"
              stroke="var(--color-revenue)"
              fill="var(--color-revenue)"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ChartContainer>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <section className={SECTION}>
          <h2 className="mb-4 text-sm font-semibold">
            {t("analytics.bestSellers")}
          </h2>
          {bestSellers.data?.length === 0 ? (
            <ListEmpty icon={BarChart3Icon} title={t("analytics.noData")} />
          ) : (
            <ol className="flex flex-col gap-3">
              {sellers.map((s, i) => (
                <li key={s.medicine_id} className="flex flex-col gap-1">
                  <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="mr-2 tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                      {s.medicine_name}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {s.units_sold}
                    </span>
                  </div>
                  <div
                    aria-hidden
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(s.units_sold / mostSold) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={SECTION}>
          <h2 className="mb-4 text-sm font-semibold">
            {t("analytics.lowStockList")}
          </h2>
          {lowStock.data?.length === 0 ? (
            <ListEmpty
              icon={CheckCircle2Icon}
              title={t("analytics.lowStockNone")}
            />
          ) : (
            <>
              <ul className="flex flex-col divide-y">
                {lowSlice.map((m) => {
                  const level = stockLevel(
                    m.stock_quantity,
                    m.reorder_threshold,
                  );
                  return (
                    <li
                      key={m.medicine_id}
                      className="flex min-w-0 items-center justify-between gap-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">{m.name}</span>
                      <Badge
                        variant="outline"
                        title={t(`analytics.level.${level}`)}
                        aria-label={t(`analytics.level.${level}`)}
                        className={`gap-1 tabular-nums ${LEVEL_CLASS[level]}`}
                      >
                        <AlertTriangleIcon />
                        {m.stock_quantity}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
              {lowPages > 1 ? (
                <nav
                  aria-label={t("catalog.pagination")}
                  className="mt-3 flex items-center justify-between gap-2"
                >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={lowPageSafe === 0}
                    onClick={() => setLowPage(lowPageSafe - 1)}
                    aria-label={t("catalog.prev")}
                  >
                    <ChevronLeftIcon />
                  </Button>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {lowPageSafe + 1} / {lowPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={lowPageSafe >= lowPages - 1}
                    onClick={() => setLowPage(lowPageSafe + 1)}
                    aria-label={t("catalog.next")}
                  >
                    <ChevronRightIcon />
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
