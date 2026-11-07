import { useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";
import { formatPrice } from "@/features/browse-catalog";
import { orderEndpoints } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { AppShell } from "@/widgets/layout";

export function OrderPage() {
  const { t, i18n } = useTranslation();
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => orderEndpoints.get(Number(orderId)),
  });
  const data = order.data;

  return (
    <AppShell>
      <Link to="/catalog" className="text-sm text-muted-foreground underline">
        {t("medicine.back")}
      </Link>

      {order.isPending ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {t("catalog.loading")}
        </p>
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
