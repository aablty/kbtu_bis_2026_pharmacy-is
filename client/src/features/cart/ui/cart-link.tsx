import { ShoppingCartIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/shared/ui/button";
import { cartCount, useCartStore } from "../model/cart-store";

export function CartLink() {
  const { t } = useTranslation();
  const count = useCartStore((state) => cartCount(state.items));

  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link to="/cart" aria-label={`${t("cart.title")} (${count})`}>
        <ShoppingCartIcon />
        {count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-5 justify-center rounded-full bg-primary px-1 text-xs leading-5 text-primary-foreground tabular-nums">
            {count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
