import type { OrderStatus } from "@/shared/api";

// Mirrors the server's _ALLOWED_TRANSITIONS so the UI only offers legal moves.
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return NEXT[status];
}

/** Completing a prescription order needs the pickup code the customer got by email. */
export function needsPickupCode(
  target: OrderStatus,
  prescriptionId: number | null,
): boolean {
  return target === "completed" && prescriptionId !== null;
}
