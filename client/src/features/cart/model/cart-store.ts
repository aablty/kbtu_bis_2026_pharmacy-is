import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Medicine } from "@/shared/api";

export interface CartItem {
  medicine_id: number;
  name: string;
  price: string;
  image: string | null;
  /** Snapshot from when the item was added; the server re-checks on checkout. */
  stock: number;
  requires_prescription: boolean;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  add: (medicine: Medicine) => void;
  setQuantity: (medicineId: number, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (medicine) =>
        set(({ items }) => {
          if (medicine.stock_quantity <= 0) return { items };
          const existing = items.find(
            (i) => i.medicine_id === medicine.medicine_id,
          );
          if (!existing) {
            const item: CartItem = {
              medicine_id: medicine.medicine_id,
              name: medicine.name,
              price: medicine.price,
              image: medicine.image_urls[0] ?? null,
              stock: medicine.stock_quantity,
              requires_prescription: medicine.requires_prescription,
              quantity: 1,
            };
            return { items: [...items, item] };
          }
          return {
            items: items.map((i) =>
              i === existing
                ? {
                    ...i,
                    stock: medicine.stock_quantity,
                    quantity: Math.min(i.quantity + 1, medicine.stock_quantity),
                  }
                : i,
            ),
          };
        }),
      setQuantity: (medicineId, quantity) =>
        set(({ items }) => ({
          items: items
            .map((i) =>
              i.medicine_id === medicineId
                ? { ...i, quantity: Math.min(quantity, i.stock) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "pillpoint-cart",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const cartCount = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.quantity, 0);

export const cartTotal = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0).toFixed(2);
