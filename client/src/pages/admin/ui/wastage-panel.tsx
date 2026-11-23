import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatPrice } from "@/features/browse-catalog";
import {
  useListWriteOffsBatchesWriteOffsGet,
  useWastageAnalyticsWastageGet,
  type WriteOffActivityResponse,
} from "@/shared/api";
import { formatDateTime } from "@/shared/lib/format-date";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ListEmpty } from "@/shared/ui/list-empty";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { SkeletonList } from "@/shared/ui/skeleton-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

const RANGES = [7, 30, 90] as const;
const LOG_LIMIT = 200;
type SortKey = "quantity" | "value";

function sortIndicator(active: boolean, direction: "asc" | "desc") {
  if (!active) return ArrowUpDownIcon;
  return direction === "asc" ? ArrowUpIcon : ArrowDownIcon;
}

export function WastagePanel() {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    { key: "value", direction: "desc" },
  );
  const wastage = useWastageAnalyticsWastageGet({ days });
  const log = useListWriteOffsBatchesWriteOffsGet({ days, limit: LOG_LIMIT });
  const [viewing, setViewing] = useState<WriteOffActivityResponse | null>(null);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const items = wastage.data?.items ?? [];
    const filtered = query
      ? items.filter((item) => item.medicine_name.toLowerCase().includes(query))
      : items;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) => (Number(a[sort.key]) - Number(b[sort.key])) * direction,
    );
  }, [wastage.data, search, sort]);

  const logRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const items = log.data ?? [];
    const filtered = query
      ? items.filter(
          (item) =>
            item.medicine_name.toLowerCase().includes(query) ||
            item.barcode?.toLowerCase().includes(query),
        )
      : items;
    return [...filtered].sort(
      (a, b) =>
        new Date(b.written_off_at).getTime() -
        new Date(a.written_off_at).getTime(),
    );
  }, [log.data, search]);

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

      <Input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("admin.wastage.searchPlaceholder")}
        aria-label={t("admin.wastage.searchPlaceholder")}
        className="sm:max-w-xs"
      />

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">
            {t("admin.wastage.summaryTab")}
          </TabsTrigger>
          <TabsTrigger value="log">{t("admin.wastage.logTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4 min-w-0">
          {wastage.isPending ? (
            <SkeletonList rows={4} label={t("catalog.loading")} />
          ) : rows.length === 0 ? (
            <ListEmpty
              icon={Trash2Icon}
              title={
                search ? t("admin.wastage.noMatches") : t("admin.wastage.empty")
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.fields.name")}</TableHead>
                  <TableHead className="text-right">
                    {sortButton("quantity", t("admin.wastage.quantity"))}
                  </TableHead>
                  <TableHead className="text-right">
                    {sortButton("value", t("admin.wastage.value"))}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => (
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
        </TabsContent>

        <TabsContent value="log" className="mt-4 min-w-0">
          {log.isPending ? (
            <SkeletonList rows={4} label={t("catalog.loading")} />
          ) : logRows.length === 0 ? (
            <ListEmpty
              icon={Trash2Icon}
              title={
                search
                  ? t("admin.wastage.noMatches")
                  : t("admin.wastage.logEmpty")
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.fields.name")}</TableHead>
                  <TableHead className="text-right">
                    {t("admin.wastage.quantity")}
                  </TableHead>
                  <TableHead>{t("admin.wastage.writtenOffBy")}</TableHead>
                  <TableHead>{t("admin.wastage.writtenOffAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logRows.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer"
                    tabIndex={0}
                    role="button"
                    aria-label={t("admin.viewDetailsFor", {
                      name: entry.medicine_name,
                    })}
                    onClick={() => setViewing(entry)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setViewing(entry);
                      }
                    }}
                  >
                    <TableCell className="min-w-0 truncate">
                      {entry.medicine_name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.quantity}
                    </TableCell>
                    <TableCell className="min-w-0 truncate">
                      {entry.written_off_by_name ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatDateTime(entry.written_off_at, i18n.language)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <Sheet
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <SheetContent className="w-full sm:max-w-xl">
          {viewing ? (
            <>
              <SheetHeader>
                <SheetTitle>{viewing.medicine_name}</SheetTitle>
              </SheetHeader>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-6 text-sm">
                <dt className="text-muted-foreground">
                  {t("admin.wastage.batchBarcode")}
                </dt>
                <dd className="break-all">{viewing.barcode ?? "—"}</dd>
                <dt className="text-muted-foreground">
                  {t("admin.wastage.quantity")}
                </dt>
                <dd>{viewing.quantity}</dd>
                <dt className="text-muted-foreground">
                  {t("admin.wastage.reason")}
                </dt>
                <dd className="break-words">{viewing.reason ?? "—"}</dd>
                <dt className="text-muted-foreground">
                  {t("admin.wastage.writtenOffBy")}
                </dt>
                <dd>{viewing.written_off_by_name ?? "—"}</dd>
                <dt className="text-muted-foreground">
                  {t("admin.wastage.writtenOffAt")}
                </dt>
                <dd className="tabular-nums">
                  {formatDateTime(viewing.written_off_at, i18n.language)}
                </dd>
              </dl>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
