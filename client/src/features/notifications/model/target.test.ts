import { describe, expect, it } from "vitest";
import type { AppNotification } from "@/shared/api";
import { notificationTarget } from "./target";

const base: AppNotification = {
  notification_id: 1,
  type: "order_status",
  message: "m",
  related_id: 7,
  read_at: null,
  created_at: "2026-11-07T10:00:00Z",
};

describe("notificationTarget", () => {
  it("opens the order for order status updates", () => {
    expect(notificationTarget(base)).toBe("/orders/7");
  });
  it("has no target for other types or missing ids", () => {
    expect(notificationTarget({ ...base, type: "low_stock" })).toBeNull();
    expect(notificationTarget({ ...base, related_id: null })).toBeNull();
  });
});
