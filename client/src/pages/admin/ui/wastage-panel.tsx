import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatPrice } from "@/features/browse-catalog";
import { useWastageAnalyticsWastageGet } from "@/shared/api";
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
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

const RANGES = [7, 30, 90] as const;

export function WastagePanel() {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const wastage = useWastageAnalyticsWastageGet({ days });
  const items = wastage.data?.items ?? [];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">
              {t("admin.wastage.totalQuantity")}
            </dt>
            <dd className="text-lg font-semibold tabular-nums">
              {wastage.data?.total_quantity ?? "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">
              {t("admin.wastage.totalValue")}
            </dt>
            <dd className="text-lg font-semibold tabular-nums">
              {wastage.data
                ? formatPrice(wastage.data.total_value, i18n.language)
                : "—"}
            </dd>
          </div>
        </dl>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={String(days)}
          onValueChange={(v) =>
            v && setDays(Number(v) as (typeof RANGES)[number])
          }
          aria-label={t("analytics.range")}
        >
          {RANGES.map((r) => (
            <ToggleGroupItem key={r} value={String(r)}>
              {t("analytics.days", { count: r })}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {wastage.isPending ? (
        <SkeletonList rows={4} label={t("catalog.loading")} />
      ) : items.length === 0 ? (
        <ListEmpty icon={Trash2Icon} title={t("admin.wastage.empty")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.fields.name")}</TableHead>
              <TableHead className="text-right">
                {t("admin.wastage.quantity")}
              </TableHead>
              <TableHead className="text-right">
                {t("admin.wastage.value")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.medicine_id}>
                <TableCell className="min-w-0 truncate">
                  {item.medicine_name}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.quantity}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPrice(item.value, i18n.language)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
