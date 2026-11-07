export type NotificationType =
  | "low_stock"
  | "order_status"
  | "prescription_status";

export interface AppNotification {
  notification_id: number;
  type: NotificationType;
  message: string;
  message_key: string | null;
  message_params: Record<string, string | number> | null;
  related_id: number | null;
  read_at: string | null;
  created_at: string;
}
