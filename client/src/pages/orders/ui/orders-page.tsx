import { useQuery } from "@tanstack/react-query";
import { ChevronRightIcon, PackageIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { formatPrice } from "@/features/browse-catalog";
import { type OrderStatus, orderEndpoints } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/format-date";
import { Badge } from "@/shared/ui/badge";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { SkeletonList } from "@/shared/ui/skeleton-list";
import { AppShell } from "@/widgets/layout";

const STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "ready",
  "completed",
  "cancelled",
];

export function OrdersPage() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: orderEndpoints.list,
  });
  const list = [...(orders.data ?? [])]
    .sort((a, b) => b.order_id - a.order_id)
    .filter((o) => status === "all" || o.status === status);

  return (
    <AppShell>
      <h1 className="font-heading mb-6 text-2xl font-semibold">
        {t("orders.title")}
      </h1>

      {orders.isPending ? (
        <SkeletonList rows={4} label={t("catalog.loading")} />
      ) : null}
      {orders.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("orders.error")}
        </p>
      ) : null}
      {orders.data && orders.data.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <PackageIcon className="size-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("orders.empty")}</p>
          <Link to="/catalog" className="text-sm underline">
            {t("cart.browse")}
          </Link>
        </div>
      ) : null}

      {orders.data && orders.data.length > 0 ? (
        <div className="mb-4 flex items-center gap-2">
          <NativeSelect
            aria-label={t("orders.filter")}
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus | "all")}
            className="w-full sm:w-56"
          >
            <NativeSelectOption value="all">
              {t("orders.allStatuses")}
            </NativeSelectOption>
            {STATUSES.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {t(`order.status.${s}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      {orders.data && orders.data.length > 0 && list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("orders.noneForFilter")}
        </p>
      ) : null}

      {list.length > 0 ? (
        <ul className="flex flex-col divide-y rounded-2xl border">
          {list.map((order) => (
            <li key={order.order_id}>
              <Link
                to={`/orders/${order.order_id}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <PackageIcon className="size-5 text-muted-foreground" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {t("orders.number", { id: order.order_id })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(order.created_at, i18n.language)} ·{" "}
                    {t("orders.itemsCount", { count: order.items.length })}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatPrice(order.total_amount, i18n.language)}
                  </span>
                  <Badge variant="secondary">
                    {t(`order.status.${order.status}`)}
                  </Badge>
                </div>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </AppShell>
  );
}
