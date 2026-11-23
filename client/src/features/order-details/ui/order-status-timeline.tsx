import { useTranslation } from "react-i18next";
import type { OrderStatusHistory } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/format-date";

/** Full status history timeline - shared by the customer order page and the
 * staff order detail view so they render identically. */
export function OrderStatusTimeline({
  history,
}: {
  history: OrderStatusHistory[];
}) {
  const { t, i18n } = useTranslation();

  return (
    <ol>
      {history.map((entry, i) => {
        const current = i === history.length - 1;
        return (
          <li
            key={`${entry.status}-${entry.changed_at}`}
            className="flex gap-3"
          >
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 size-2.5 rounded-full ${current ? "bg-primary ring-4 ring-primary/20" : "bg-muted-foreground/40"}`}
              />
              {current ? null : <span className="w-px flex-1 bg-border" />}
            </div>
            <div className="pb-4 text-sm">
              <p className={current ? "font-medium" : "text-muted-foreground"}>
                {t(`order.status.${entry.status}`)}
              </p>
              <time
                dateTime={entry.changed_at}
                className="text-xs text-muted-foreground"
              >
                {formatDateTime(entry.changed_at, i18n.language)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
