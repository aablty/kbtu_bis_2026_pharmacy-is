import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationEndpoints } from "@/shared/api";

const POLL_INTERVAL_MS = 30_000;

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: notificationEndpoints.list,
    enabled,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationEndpoints.markRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
