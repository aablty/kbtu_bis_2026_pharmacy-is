import { BellIcon, PackageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import type { AppNotification } from "@/shared/api";
import { useSessionStore } from "@/shared/auth";
import { formatDateTime } from "@/shared/lib/format-date";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { notificationTarget } from "../model/target";
import {
  useMarkNotificationRead,
  useNotifications,
} from "../model/use-notifications";

export function NotificationsBell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const notifications = useNotifications(!!user);
  const markRead = useMarkNotificationRead();

  if (!user) return null;
  const items = notifications.data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  function open(notification: AppNotification) {
    if (!notification.read_at) markRead.mutate(notification.notification_id);
    const target = notificationTarget(notification);
    if (target) navigate(target);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`${t("notifications.title")} (${unread})`}
        >
          <BellIcon />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-5 justify-center rounded-full bg-primary px-1 text-xs leading-5 text-primary-foreground tabular-nums">
              {unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-medium">
          {t("notifications.title")}
        </div>
        {items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {t("notifications.empty")}
          </p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {items.map((notification) => (
              <li key={notification.notification_id}>
                <button
                  type="button"
                  onClick={() => open(notification)}
                  className={`flex w-full gap-3 px-4 py-3 text-left text-sm hover:bg-accent ${notification.read_at ? "" : "bg-primary/5"}`}
                >
                  <PackageIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span>{notification.message}</span>
                    <time
                      dateTime={notification.created_at}
                      className="text-xs text-muted-foreground"
                    >
                      {formatDateTime(notification.created_at, i18n.language)}
                    </time>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
