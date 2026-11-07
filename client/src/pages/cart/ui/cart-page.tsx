import {
  ArrowRightIcon,
  FileTextIcon,
  MinusIcon,
  PackageIcon,
  PlusIcon,
  ShoppingCartIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { formatPrice } from "@/features/browse-catalog";
import { cartTotal, useCartStore } from "@/features/cart";
import { Button } from "@/shared/ui/button";
import { AppShell } from "@/widgets/layout";

export function CartPage() {
  const { t, i18n } = useTranslation();
  const items = useCartStore((state) => state.items);
  const setQuantity = useCartStore((state) => state.setQuantity);

  return (
    <AppShell>
      <h1 className="font-heading mb-6 text-2xl font-semibold">
        {t("cart.title")}
      </h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <ShoppingCartIcon className="size-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("cart.empty")}</p>
          <Button asChild variant="outline">
            <Link to="/catalog">{t("cart.browse")}</Link>
          </Button>
        </div>
      ) : (
        // On phones the summary is a bottom bar; the list gets bottom padding so the last row is reachable.
        <div className="grid gap-6 pb-28 md:grid-cols-[1fr_18rem] md:pb-0">
          <ul className="flex flex-col divide-y rounded-2xl border">
            {items.map((item) => (
              <li key={item.medicine_id} className="flex gap-4 p-4">
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="size-full object-contain"
                    />
                  ) : (
                    <PackageIcon className="size-8 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    to={`/catalog/${item.medicine_id}`}
                    className="line-clamp-2 text-sm font-medium hover:underline"
                  >
                    {item.name}
                  </Link>
                  {item.requires_prescription ? (
                    <span
                      role="img"
                      aria-label={t("catalog.requiresPrescription")}
                      title={t("catalog.requiresPrescription")}
                      className="inline-flex w-fit items-center gap-1 text-xs text-amber-600"
                    >
                      <FileTextIcon className="size-3.5" />
                    </span>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={t("cart.decrease")}
                        onClick={() =>
                          setQuantity(item.medicine_id, item.quantity - 1)
                        }
                      >
                        <MinusIcon />
                      </Button>
                      <span className="w-8 text-center text-sm tabular-nums">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={t("cart.increase")}
                        disabled={item.quantity >= item.stock}
                        onClick={() =>
                          setQuantity(item.medicine_id, item.quantity + 1)
                        }
                      >
                        <PlusIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("cart.remove")}
                        onClick={() => setQuantity(item.medicine_id, 0)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatPrice(
                        String(Number(item.price) * item.quantity),
                        i18n.language,
                      )}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t bg-background/95 p-4 backdrop-blur-md md:static md:h-fit md:flex-col md:items-stretch md:rounded-2xl md:border md:bg-transparent md:backdrop-blur-none">
            <div className="flex flex-col md:flex-row md:items-baseline md:justify-between">
              <span className="text-sm text-muted-foreground">
                {t("cart.subtotal")}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatPrice(cartTotal(items), i18n.language)}
              </span>
            </div>
            <Button asChild size="lg" className="w-auto md:w-full">
              <Link to="/checkout">
                {t("cart.checkout")}
                <ArrowRightIcon />
              </Link>
            </Button>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
