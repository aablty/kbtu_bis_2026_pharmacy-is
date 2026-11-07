import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { formatPrice } from "@/features/browse-catalog";
import { cartTotal, useCartStore } from "@/features/cart";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { AppShell } from "@/widgets/layout";
import { PlaceOrderForm } from "./place-order-form";

export function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const items = useCartStore((state) => state.items);
  // Checked once on mount only: the cart is cleared right after a successful order, and that must not redirect.
  const [startedEmpty] = useState(() => items.length === 0);
  if (startedEmpty) return <Navigate to="/cart" replace />;

  const needsPrescription = items.some((i) => i.requires_prescription);

  return (
    <AppShell>
      <h1 className="font-heading mb-6 text-2xl font-semibold">
        {t("checkout.title")}
      </h1>
      <div className="grid gap-6 md:grid-cols-[1fr_18rem]">
        <section className="max-w-xl">
          <PlaceOrderForm needsPrescription={needsPrescription} />
        </section>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">{t("checkout.summary")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <li
                  key={item.medicine_id}
                  className="flex justify-between gap-3"
                >
                  <span className="min-w-0 truncate">
                    {item.name}
                    <span className="text-muted-foreground">
                      {" "}
                      × {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatPrice(
                      String(Number(item.price) * item.quantity),
                      i18n.language,
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between border-t pt-3">
              <span className="text-muted-foreground">
                {t("cart.subtotal")}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatPrice(cartTotal(items), i18n.language)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
