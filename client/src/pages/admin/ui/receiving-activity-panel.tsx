import { useQueries } from "@tanstack/react-query";
import { ClipboardListIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  catalogEndpoints,
  useListReceivingActivityBatchesReceivingActivityGet,
} from "@/shared/api";
import { formatDateTime } from "@/shared/lib/format-date";
import { ListEmpty } from "@/shared/ui/list-empty";
import { SkeletonList } from "@/shared/ui/skeleton-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

const LIMIT = 50;

export function ReceivingActivityPanel() {
  const { t, i18n } = useTranslation();
  const activity = useListReceivingActivityBatchesReceivingActivityGet({
    limit: LIMIT,
  });
  const rows = activity.data ?? [];
  const medicineIds = [...new Set(rows.map((r) => r.medicine_id))];
  const medicineQueries = useQueries({
    queries: medicineIds.map((id) => ({
      queryKey: ["medicine", id],
      queryFn: () => catalogEndpoints.medicine(id),
    })),
  });
  const nameOf = (id: number) =>
    medicineQueries[medicineIds.indexOf(id)]?.data?.name ?? "—";

  if (activity.isPending) {
    return <SkeletonList rows={4} label={t("catalog.loading")} />;
  }

  if (rows.length === 0) {
    return (
      <ListEmpty icon={ClipboardListIcon} title={t("admin.receiving.empty")} />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("admin.fields.name")}</TableHead>
          <TableHead className="text-right">
            {t("admin.receiving.quantityReceived")}
          </TableHead>
          <TableHead>{t("admin.receiving.receivedBy")}</TableHead>
          <TableHead>{t("admin.receiving.receivedAt")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.batch_id}>
            <TableCell className="min-w-0 truncate">
              {nameOf(r.medicine_id)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {r.quantity_received}
            </TableCell>
            <TableCell className="min-w-0 truncate">
              {r.received_by_name ?? "—"}
            </TableCell>
            <TableCell className="tabular-nums">
              {formatDateTime(r.received_at, i18n.language)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
