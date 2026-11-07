import { ShoppingCartIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { cartCount, useCartStore } from "../model/cart-store";

/** Floating cart button, bottom-left, mobile only; hidden while the cart is empty. */
export function CartFab() {
  const { t } = useTranslation();
  const count = useCartStore((state) => cartCount(state.items));
  if (count === 0) return null;

  return (
    <Link
      to="/cart"
      aria-label={`${t("cart.title")} (${count})`}
      className="fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden"
    >
      <ShoppingCartIcon className="size-6" />
      <span className="absolute -top-1 -right-1 flex min-w-6 justify-center rounded-full bg-foreground px-1.5 text-xs leading-6 text-background tabular-nums">
        {count}
      </span>
    </Link>
  );
}
