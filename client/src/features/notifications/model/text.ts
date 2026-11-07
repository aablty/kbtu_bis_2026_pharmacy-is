import type { AppNotification } from "@/shared/api";

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Localized text for a notification; old rows without a key keep the server's English. */
export function notificationText(
  notification: AppNotification,
  translate: Translate,
): string {
  if (!notification.message_key) return notification.message;
  const params: Record<string, unknown> = { ...notification.message_params };
  if (
    notification.message_key === "order_status" &&
    typeof params.status === "string"
  ) {
    params.status = translate(`order.status.${params.status}`);
  }
  return translate(
    `notifications.messages.${notification.message_key}`,
    params,
  );
}
