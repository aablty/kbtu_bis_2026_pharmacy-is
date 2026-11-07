import { describe, expect, it } from "vitest";
import type { AppNotification } from "@/shared/api";
import { notificationText } from "./text";

const base: AppNotification = {
  notification_id: 1,
  type: "order_status",
  message: "Your order #3 is now ready.",
  message_key: null,
  message_params: null,
  related_id: 3,
  read_at: null,
  created_at: "2026-11-07T10:00:00Z",
};

// Stand-in translator: shows the key and the params it received.
const translate = (key: string, options?: Record<string, unknown>) =>
  `${key}${options ? JSON.stringify(options) : ""}`;

describe("notificationText", () => {
  it("keeps the server message when there is no key", () => {
    expect(notificationText(base, translate)).toBe(
      "Your order #3 is now ready.",
    );
  });
  it("translates the order status inside the sentence", () => {
    const text = notificationText(
      {
        ...base,
        message_key: "order_status",
        message_params: { order_id: 3, status: "ready" },
      },
      translate,
    );
    expect(text).toBe(
      'notifications.messages.order_status{"order_id":3,"status":"order.status.ready"}',
    );
  });
});
