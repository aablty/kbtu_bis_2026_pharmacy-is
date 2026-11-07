import {
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Medicine } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { useCartStore } from "../model/cart-store";

/** "Add to cart" until the medicine is in the cart, then a stepper with delete. */
export function CartControl({
  medicine,
  compact = false,
}: {
  medicine: Medicine;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const quantity = useCartStore(
    (state) =>
      state.items.find((i) => i.medicine_id === medicine.medicine_id)
        ?.quantity ?? 0,
  );
  const add = useCartStore((state) => state.add);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const inStock = medicine.stock_quantity > 0;

  if (quantity === 0) {
    if (compact) {
      return (
        <Button
          size="icon-sm"
          disabled={!inStock}
          aria-label={inStock ? t("cart.add") : t("cart.outOfStock")}
          title={inStock ? t("cart.add") : t("cart.outOfStock")}
          onClick={() => add(medicine)}
        >
          <ShoppingCartIcon />
        </Button>
      );
    }
    return (
      <Button disabled={!inStock} onClick={() => add(medicine)}>
        <ShoppingCartIcon />
        {inStock ? t("cart.add") : t("cart.outOfStock")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t("cart.decrease")}
        onClick={() => setQuantity(medicine.medicine_id, quantity - 1)}
      >
        <MinusIcon />
      </Button>
      <span aria-live="polite" className="w-8 text-center text-sm tabular-nums">
        {quantity}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={t("cart.increase")}
        disabled={quantity >= medicine.stock_quantity}
        onClick={() => add(medicine)}
      >
        <PlusIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("cart.remove")}
        onClick={() => setQuantity(medicine.medicine_id, 0)}
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}
