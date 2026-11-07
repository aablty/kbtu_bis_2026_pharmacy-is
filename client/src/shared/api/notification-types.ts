export type NotificationType =
  | "low_stock"
  | "order_status"
  | "prescription_status";

export interface AppNotification {
  notification_id: number;
  type: NotificationType;
  message: string;
  related_id: number | null;
  read_at: string | null;
  created_at: string;
}
