import { useQuery } from "@tanstack/react-query";
import { ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { formatPrice } from "@/features/browse-catalog";
import { orderEndpoints, prescriptionEndpoints } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/format-date";
import { Badge } from "@/shared/ui/badge";
import { summarize } from "../model/summary";

/** Customer overview as one strip: four figures, then the latest order. */
export function SummarySection() {
  const { t, i18n } = useTranslation();
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: orderEndpoints.list,
  });
  const prescriptions = useQuery({
    queryKey: ["prescriptions"],
    queryFn: prescriptionEndpoints.list,
  });

  if (!orders.data || !prescriptions.data) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("catalog.loading")}
      </p>
    );
  }

  const s = summarize(orders.data, prescriptions.data);
  const figures = [
    { label: t("profile.summary.orders"), value: String(s.orderCount) },
    {
      label: t("profile.summary.spent"),
      value: formatPrice(s.totalSpent, i18n.language),
    },
    {
      label: t("profile.summary.approved"),
      value: String(s.approvedPrescriptions),
    },
    {
      label: t("profile.summary.pending"),
      value: String(s.pendingPrescriptions),
    },
  ];

  return (
    <section
      aria-label={t("profile.summary.title")}
      className="overflow-hidden rounded-2xl border"
    >
      <dl className="grid grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0">
        {figures.map((f) => (
          <div key={f.label} className="flex flex-col gap-1 p-4">
            <dt className="text-xs text-muted-foreground">{f.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{f.value}</dd>
          </div>
        ))}
      </dl>

      {s.lastOrder ? (
        <Link
          to={`/orders/${s.lastOrder.order_id}`}
          className="flex items-center gap-3 border-t px-4 py-3 text-sm transition-colors hover:bg-accent/50"
        >
          <span className="text-muted-foreground">
            {t("profile.summary.last")}
          </span>
          <span className="font-medium">
            {t("orders.number", { id: s.lastOrder.order_id })}
          </span>
          <span className="hidden text-muted-foreground sm:inline">
            {formatDateTime(s.lastOrder.created_at, i18n.language)}
          </span>
          <Badge variant="secondary" className="ml-auto">
            {t(`order.status.${s.lastOrder.status}`)}
          </Badge>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : (
        <p className="border-t px-4 py-3 text-sm text-muted-foreground">
          {t("profile.summary.none")}
        </p>
      )}
    </section>
  );
}
