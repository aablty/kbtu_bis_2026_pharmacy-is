import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { formatPrice } from "@/features/browse-catalog";
import { analyticsEndpoints } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/ui/chart";
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

export function AnalyticsPanel() {
  const { t, i18n } = useTranslation();
  // Chart labels come from the locale, so they are built inside the component.
  const revenueConfig = {
    revenue: { label: t("analytics.totalRevenue"), color: "var(--chart-1)" },
  } satisfies ChartConfig;
  const unitsConfig = {
    units_sold: { label: t("analytics.units"), color: "var(--chart-2)" },
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

  const today = new Date().toISOString().slice(0, 10);
  const series = fillRevenueDays(revenue.data?.days ?? [], days, today);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>{t("analytics.totalRevenue")}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {revenue.data
                  ? formatPrice(revenue.data.total_revenue, i18n.language)
                  : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>{t("analytics.topSeller")}</CardDescription>
              <CardTitle className="truncate text-base">
                {bestSellers.data?.[0]?.medicine_name ?? "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>{t("analytics.lowStock")}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {lowStock.data?.length ?? "—"}
              </CardTitle>
            </CardHeader>
          </Card>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("analytics.revenueByDay")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueConfig} className="h-64 w-full">
            <AreaChart data={series} margin={{ left: 8, right: 8 }}>
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
                width={72}
                tickFormatter={(v: number) => v.toLocaleString(i18n.language)}
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
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("analytics.bestSellers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestSellers.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("analytics.noData")}
              </p>
            ) : (
              <ChartContainer config={unitsConfig} className="h-56 w-full">
                <BarChart
                  data={bestSellers.data ?? []}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="medicine_name"
                    tickLine={false}
                    axisLine={false}
                    width={140}
                    tickFormatter={(v: string) =>
                      v.length > 20 ? `${v.slice(0, 19)}…` : v
                    }
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="units_sold"
                    fill="var(--color-units_sold)"
                    radius={4}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("analytics.lowStockList")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("analytics.lowStockNone")}
              </p>
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
                        className="flex items-center justify-between gap-3 py-2 text-sm"
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
