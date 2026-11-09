import { beforeEach, describe, expect, it } from "vitest";
import type { Medicine } from "@/shared/api";
import { cartCount, cartTotal, useCartStore } from "./cart-store";

const medicine = (over: Partial<Medicine> = {}): Medicine => ({
  medicine_id: 1,
  name: "Test",
  manufacturer: null,
  dosage_form: null,
  expiry_date: null,
  price: "100.00",
  requires_prescription: false,
  stock_quantity: 3,
  reorder_threshold: 0,
  category_id: 1,
  supplier_id: 1,
  image_urls: [],
  ...over,
});

describe("cart store", () => {
  beforeEach(() => useCartStore.getState().clear());

  it("increments quantity on repeat add and never exceeds stock", () => {
    const { add } = useCartStore.getState();
    add(medicine());
    add(medicine());
    expect(useCartStore.getState().items[0].quantity).toBe(2);
    for (let i = 0; i < 5; i++) add(medicine());
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it("ignores out-of-stock medicines", () => {
    useCartStore.getState().add(medicine({ stock_quantity: 0 }));
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("removes an item when quantity drops to zero and clamps to stock", () => {
    const { add, setQuantity } = useCartStore.getState();
    add(medicine());
    setQuantity(1, 10);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
    setQuantity(1, 0);
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("sums count and total", () => {
    const { add, setQuantity } = useCartStore.getState();
    add(medicine({ medicine_id: 1, price: "2500.00" }));
    add(medicine({ medicine_id: 2, price: "10.50", stock_quantity: 5 }));
    setQuantity(2, 2);
    const { items } = useCartStore.getState();
    expect(cartCount(items)).toBe(3);
    expect(cartTotal(items)).toBe("2521.00");
  });
});
