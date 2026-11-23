import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatPrice } from "@/features/browse-catalog";
import { OrderItemsList, OrderStatusTimeline } from "@/features/order-details";
import type { Order, OrderStatus } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";

const BADGE: Record<OrderStatus, "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  confirmed: "secondary",
  ready: "secondary",
  completed: "secondary",
  cancelled: "destructive",
};

export function OrderDetailSheet({
  order,
  onOpenChange,
  renderActions,
}: {
  order: Order | null;
  onOpenChange: (open: boolean) => void;
  renderActions: (order: Order) => ReactNode;
}) {
  const { t, i18n } = useTranslation();

  return (
    <Sheet open={order !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-[90vw]">
        {order ? (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
                <SheetTitle>
                  {t("order.title", { id: order.order_id })}
                </SheetTitle>
                <Badge variant={BADGE[order.status]}>
                  {t(`order.status.${order.status}`)}
                </Badge>
              </div>
            </SheetHeader>
            <div className="flex flex-col gap-4 overflow-y-auto px-6">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">
                  {t("staff.orders.customer")}
                </dt>
                <dd>
                  {order.customer_name ??
                    order.customer_email ??
                    t("staff.orders.customerId", { id: order.customer_id })}
                </dd>
              </dl>

              <OrderItemsList items={order.items} />

              <div className="flex items-baseline justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">
                  {t("order.total")}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {formatPrice(order.total_amount, i18n.language)}
                </span>
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">
                  {t("checkout.fulfillment")}
                </dt>
                <dd>
                  {t(`checkout.${order.fulfillment_type}`)}
                  {order.delivery_address ? `: ${order.delivery_address}` : ""}
                </dd>
                <dt className="text-muted-foreground">{t("order.payment")}</dt>
                <dd>
                  {order.payment
                    ? `${t(`checkout.${order.payment.method === "cash" ? "cash" : "card"}`)} · ${t(`order.paymentStatus.${order.payment.status}`)}`
                    : "—"}
                </dd>
              </dl>

              <section className="flex flex-col gap-2 border-t pt-4">
                <h2 className="text-sm font-medium">{t("order.tracking")}</h2>
                <OrderStatusTimeline history={order.history} />
              </section>
            </div>
            <SheetFooter className="flex-row flex-wrap gap-2">
              {renderActions(order)}
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
