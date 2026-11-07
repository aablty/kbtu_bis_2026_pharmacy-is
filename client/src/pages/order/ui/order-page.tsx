import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, CheckCircle2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";
import { formatPrice } from "@/features/browse-catalog";
import { orderEndpoints } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/format-date";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { AppShell } from "@/widgets/layout";

export function OrderPage() {
  const { t, i18n } = useTranslation();
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderEndpoints.get(Number(orderId)),
    // Keep the timeline live until the order reaches a final state.
    refetchInterval: (query) =>
      query.state.data &&
      !["completed", "cancelled"].includes(query.state.data.status)
        ? 15_000
        : false,
  });
  const data = order.data;

  return (
    <AppShell>
      <Link
        to="/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        {t("orders.title")}
      </Link>

      {order.isPending ? (
        <Card
          className="mt-4 max-w-2xl"
          role="status"
          aria-busy="true"
          aria-label={t("catalog.loading")}
        >
          <CardHeader className="gap-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-24 w-full" />
          </CardContent>
        </Card>
      ) : null}
      {order.isError ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {t("order.notFound")}
        </p>
      ) : null}

      {data ? (
        <Card className="mt-4 max-w-2xl">
          <CardHeader className="gap-2">
            {params.has("placed") ? (
              <p className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2Icon className="size-4" />
                {t("order.placed")}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-xl">
                {t("order.title", { id: data.order_id })}
              </CardTitle>
              <Badge variant="secondary">
                {t(`order.status.${data.status}`)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col divide-y">
              {data.items.map((item) => (
                <li
                  key={item.medicine_id}
                  className="flex justify-between gap-4 py-2 text-sm"
                >
                  <span className="min-w-0">
                    {item.medicine_name}
                    <span className="text-muted-foreground">
                      {" "}
                      × {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatPrice(
                      String(Number(item.unit_price) * item.quantity),
                      i18n.language,
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between border-t pt-3">
              <span className="text-sm text-muted-foreground">
                {t("order.total")}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatPrice(data.total_amount, i18n.language)}
              </span>
            </div>
            <section className="flex flex-col gap-2 border-t pt-4">
              <h2 className="text-sm font-medium">{t("order.tracking")}</h2>
              <ol>
                {data.history.map((entry, i) => {
                  const current = i === data.history.length - 1;
                  return (
                    <li
                      key={`${entry.status}-${entry.changed_at}`}
                      className="flex gap-3"
                    >
                      <div className="flex flex-col items-center">
                        <span
                          className={`mt-1 size-2.5 rounded-full ${current ? "bg-primary ring-4 ring-primary/20" : "bg-muted-foreground/40"}`}
                        />
                        {current ? null : (
                          <span className="w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="pb-4 text-sm">
                        <p
                          className={
                            current ? "font-medium" : "text-muted-foreground"
                          }
                        >
                          {t(`order.status.${entry.status}`)}
                        </p>
                        <time
                          dateTime={entry.changed_at}
                          className="text-xs text-muted-foreground"
                        >
                          {formatDateTime(entry.changed_at, i18n.language)}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">
                {t("checkout.fulfillment")}
              </dt>
              <dd>
                {t(`checkout.${data.fulfillment_type}`)}
                {data.delivery_address ? `: ${data.delivery_address}` : ""}
              </dd>
              <dt className="text-muted-foreground">{t("order.payment")}</dt>
              <dd>
                {data.payment
                  ? `${t(`checkout.${data.payment.method === "cash" ? "cash" : "card"}`)} · ${t(`order.paymentStatus.${data.payment.status}`)}`
                  : "—"}
              </dd>
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}
