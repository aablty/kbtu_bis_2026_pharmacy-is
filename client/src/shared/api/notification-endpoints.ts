import { apiClient } from "./client";
import type { AppNotification } from "./notification-types";

export const notificationEndpoints = {
  list: () =>
    apiClient.get<AppNotification[]>("/notifications").then((r) => r.data),
  markRead: (notificationId: number) =>
    apiClient
      .patch<AppNotification>(`/notifications/${notificationId}/read`)
      .then((r) => r.data),
};
