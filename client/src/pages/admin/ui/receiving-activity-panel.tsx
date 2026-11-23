import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ClipboardListIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useListReceivingActivityBatchesReceivingActivityGet } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/format-date";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
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

const LIMIT = 200;
const RANGES = [7, 30, 90] as const;
type SortKey = "received_at" | "quantity_received";

function sortIndicator(active: boolean, direction: "asc" | "desc") {
  if (!active) return ArrowUpDownIcon;
  return direction === "asc" ? ArrowUpIcon : ArrowDownIcon;
}

export function ReceivingActivityPanel() {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    { key: "received_at", direction: "desc" },
  );
  const activity = useListReceivingActivityBatchesReceivingActivityGet({
    limit: LIMIT,
  });

  const rows = useMemo(() => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const query = search.trim().toLowerCase();
    const filtered = (activity.data ?? []).filter((r) => {
      if (new Date(r.received_at).getTime() < cutoff) return false;
      if (query && !r.medicine_name.toLowerCase().includes(query)) return false;
      return true;
    });
    const direction = sort.direction === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      if (sort.key === "quantity_received") {
        return (a.quantity_received - b.quantity_received) * direction;
      }
      return (
        (new Date(a.received_at).getTime() -
          new Date(b.received_at).getTime()) *
        direction
      );
    });
  }, [activity.data, days, search, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  }

  function sortButton(key: SortKey, label: string) {
    const active = sort.key === key;
    const Icon = sortIndicator(active, sort.direction);
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-3 h-7 gap-1 px-2 font-medium"
        onClick={() => toggleSort(key)}
      >
        {label}
        <Icon
          className={active ? "size-3.5" : "size-3.5 text-muted-foreground"}
        />
      </Button>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.receiving.searchPlaceholder")}
          aria-label={t("admin.receiving.searchPlaceholder")}
          className="sm:max-w-xs"
        />
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

      {activity.isPending ? (
        <SkeletonList rows={4} label={t("catalog.loading")} />
      ) : rows.length === 0 ? (
        <ListEmpty
          icon={ClipboardListIcon}
          title={t("admin.receiving.empty")}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.fields.name")}</TableHead>
              <TableHead className="text-right">
                {sortButton(
                  "quantity_received",
                  t("admin.receiving.quantityReceived"),
                )}
              </TableHead>
              <TableHead>{t("admin.receiving.receivedBy")}</TableHead>
              <TableHead>
                {sortButton("received_at", t("admin.receiving.receivedAt"))}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.batch_id}>
                <TableCell className="min-w-0 truncate">
                  {r.medicine_name}
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
      )}
    </div>
  );
}
