import type { AppNotification } from "@/shared/api";

/** Where a notification leads; null when it has nothing to open. */
export function notificationTarget(
  notification: AppNotification,
): string | null {
  if (
    notification.type === "order_status" &&
    notification.related_id !== null
  ) {
    return `/orders/${notification.related_id}`;
  }
  return null;
}
