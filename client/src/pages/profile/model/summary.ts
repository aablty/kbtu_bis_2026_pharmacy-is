import type { Order, Prescription } from "@/shared/api";

export interface ProfileSummary {
  orderCount: number;
  /** Sum of orders that were not cancelled, as a decimal string. */
  totalSpent: string;
  lastOrder: Order | null;
  approvedPrescriptions: number;
  pendingPrescriptions: number;
}

export function summarize(
  orders: Order[],
  prescriptions: Prescription[],
): ProfileSummary {
  const live = orders.filter((o) => o.status !== "cancelled");
  const spent = live.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const lastOrder = orders.reduce<Order | null>(
    (latest, o) => (!latest || o.created_at > latest.created_at ? o : latest),
    null,
  );
  return {
    orderCount: orders.length,
    totalSpent: spent.toFixed(2),
    lastOrder,
    approvedPrescriptions: prescriptions.filter((p) => p.status === "approved")
      .length,
    pendingPrescriptions: prescriptions.filter((p) => p.status === "pending")
      .length,
  };
}
