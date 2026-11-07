import { ShoppingCartIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/shared/ui/button";
import { cartCount, useCartStore } from "../model/cart-store";

const BADGE =
  "flex min-w-5 justify-center rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground tabular-nums";

/** `icon` for the header; `row` for the mobile menu, with its label and count. */
export function CartLink({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const { t } = useTranslation();
  const count = useCartStore((state) => cartCount(state.items));

  if (variant === "row") {
    return (
      <Button
        asChild
        variant="ghost"
        className="h-11 w-full justify-start gap-3 px-3 text-sm font-medium"
      >
        <Link to="/cart">
          <ShoppingCartIcon className="size-5 text-muted-foreground" />
          {t("cart.title")}
          {count > 0 ? (
            <span className={`ml-auto ${BADGE}`}>{count}</span>
          ) : null}
        </Link>
      </Button>
    );
  }

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
