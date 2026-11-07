import { useQuery } from "@tanstack/react-query";
import { ChevronRightIcon, PackageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { formatPrice } from "@/features/browse-catalog";
import { orderEndpoints } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/format-date";
import { Badge } from "@/shared/ui/badge";
import { AppShell } from "@/widgets/layout";

export function OrdersPage() {
  const { t, i18n } = useTranslation();
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: orderEndpoints.list,
  });
  const list = [...(orders.data ?? [])].sort((a, b) => b.order_id - a.order_id);

  return (
    <AppShell>
      <h1 className="font-heading mb-6 text-2xl font-semibold">
        {t("orders.title")}
      </h1>

      {orders.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("catalog.loading")}
        </p>
      ) : null}
      {orders.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("orders.error")}
        </p>
      ) : null}
      {orders.data && list.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <PackageIcon className="size-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("orders.empty")}</p>
          <Link to="/catalog" className="text-sm underline">
            {t("cart.browse")}
          </Link>
        </div>
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
