import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PackageIcon,
  TrendingUpIcon,
  TrophyIcon,
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
import { SkeletonList } from "@/shared/ui/skeleton-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { fillRevenueDays } from "../model/revenue-series";
import { stockLevel } from "../model/stock-level";

const RANGES = [7, 30, 90] as const;
const TOP_N = 10;
const LOW_STOCK_PAGE = 5;
const EXPIRING_WITHIN_DAYS = 30;
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
  const expiringBatches = useQuery({
    queryKey: ["analytics", "expiring-batches", EXPIRING_WITHIN_DAYS],
    queryFn: () => analyticsEndpoints.expiringBatches(EXPIRING_WITHIN_DAYS),
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
          <div className="flex flex-col gap-1.5 bg-card p-4 md:p-5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUpIcon className="size-3.5" />
              {t("analytics.totalRevenue")}
            </dt>
            <dd className="text-2xl font-semibold tracking-tight tabular-nums">
              {revenue.data
                ? formatPrice(revenue.data.total_revenue, i18n.language)
                : "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1.5 bg-card p-4 md:p-5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <PackageIcon className="size-3.5" />
              {t("analytics.lowStock")}
            </dt>
            <dd className="text-2xl font-semibold tracking-tight tabular-nums">
              {lowStock.data?.length ?? "—"}
            </dd>
          </div>
          <div className="col-span-2 flex min-w-0 flex-col gap-1.5 bg-card p-4 sm:col-span-1 md:p-5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrophyIcon className="size-3.5" />
              {t("analytics.topSeller")}
            </dt>
            <dd className="truncate text-lg font-semibold tracking-tight">
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
          <AreaChart data={series} margin={{ top: 8, left: 0, right: 8 }}>
            <defs>
              <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-revenue)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-revenue)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: string) => v.slice(5)}
              minTickGap={24}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              fontSize={12}
              tickFormatter={(v: number) => compact.format(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(v) =>
                    new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: "medium",
                    }).format(new Date(`${v}T00:00:00`))
                  }
                  formatter={(value) => (
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        {t("analytics.totalRevenue")}
                      </span>
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {formatPrice(String(value), i18n.language)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Area
              dataKey="revenue"
              type="monotone"
              stroke="var(--color-revenue)"
              strokeWidth={2}
              fill="url(#revenue-fill)"
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ChartContainer>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <section className={SECTION}>
          <h2 className="mb-4 text-sm font-semibold">
            {t("analytics.bestSellers")}
          </h2>
          {bestSellers.isPending ? (
            <SkeletonList rows={3} label={t("catalog.loading")} />
          ) : bestSellers.data?.length === 0 ? (
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
          {lowStock.isPending ? (
            <SkeletonList rows={3} label={t("catalog.loading")} />
          ) : lowStock.data?.length === 0 ? (
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

      <section className={SECTION}>
        <h2 className="mb-4 text-sm font-semibold">
          {t("analytics.expiringBatches")}
        </h2>
        {expiringBatches.isPending ? (
          <SkeletonList rows={3} label={t("catalog.loading")} />
        ) : expiringBatches.data?.length === 0 ? (
          <ListEmpty
            icon={CheckCircle2Icon}
            title={t("analytics.expiringBatchesNone")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.fields.name")}</TableHead>
                <TableHead>{t("analytics.expiryDate")}</TableHead>
                <TableHead className="text-right">
                  {t("analytics.quantityRemaining")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(expiringBatches.data ?? []).map((b) => (
                <TableRow key={b.batch_id}>
                  <TableCell className="min-w-0 truncate">
                    {b.medicine_name}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    }).format(new Date(b.expiry_date))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {b.quantity_remaining}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
