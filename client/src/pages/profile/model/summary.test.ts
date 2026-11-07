import { describe, expect, it } from "vitest";
import type { Order, Prescription } from "@/shared/api";
import { summarize } from "./summary";

const order = (
  id: number,
  status: Order["status"],
  total: string,
  created: string,
) =>
  ({ order_id: id, status, total_amount: total, created_at: created }) as Order;
const rx = (id: number, status: Prescription["status"]) =>
  ({ prescription_id: id, status }) as Prescription;

describe("summarize", () => {
  it("counts orders, leaves cancelled ones out of the total, and finds the latest", () => {
    const s = summarize(
      [
        order(1, "completed", "100.00", "2026-11-01T10:00:00Z"),
        order(2, "cancelled", "999.00", "2026-11-05T10:00:00Z"),
        order(3, "confirmed", "50.50", "2026-11-03T10:00:00Z"),
      ],
      [rx(1, "approved"), rx(2, "pending"), rx(3, "pending")],
    );
    expect(s.orderCount).toBe(3);
    expect(s.totalSpent).toBe("150.50");
    expect(s.lastOrder?.order_id).toBe(2);
    expect(s.approvedPrescriptions).toBe(1);
    expect(s.pendingPrescriptions).toBe(2);
  });
  it("handles a customer with nothing yet", () => {
    const s = summarize([], []);
    expect(s).toEqual({
      orderCount: 0,
      totalSpent: "0.00",
      lastOrder: null,
      approvedPrescriptions: 0,
      pendingPrescriptions: 0,
    });
  });
});
