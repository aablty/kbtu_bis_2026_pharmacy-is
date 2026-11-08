import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, PackageIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatPrice } from "@/features/browse-catalog";
import { type Order, type OrderStatus, staffEndpoints } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/format-date";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { ListEmpty } from "@/shared/ui/list-empty";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { SkeletonList } from "@/shared/ui/skeleton-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Toggle } from "@/shared/ui/toggle";
import { needsPickupCode, nextStatuses } from "../model/order-transitions";
import { staffErrorKey } from "../model/staff-error";

const BADGE: Record<OrderStatus, "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  confirmed: "secondary",
  ready: "secondary",
  completed: "secondary",
  cancelled: "destructive",
};
const STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "ready",
  "completed",
  "cancelled",
];

export function OrdersPanel() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<{
    order: Order;
    target: OrderStatus;
  } | null>(null);
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [rxOnly, setRxOnly] = useState(false);

  const orders = useQuery({
    queryKey: ["staff-orders"],
    queryFn: staffEndpoints.orders.list,
  });

  const update = useMutation({
    mutationFn: (vars: {
      orderId: number;
      status: OrderStatus;
      pickupCode?: string;
    }) =>
      staffEndpoints.orders.updateStatus(
        vars.orderId,
        vars.status,
        vars.pickupCode,
      ),
    onSuccess: () => {
      setPending(null);
      setCode("");
      void queryClient.invalidateQueries({ queryKey: ["staff-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["order"] });
    },
  });

  function move(order: Order, target: OrderStatus) {
    if (needsPickupCode(target, order.prescription_id)) {
      update.reset();
      setPending({ order, target });
      return;
    }
    update.mutate({ orderId: order.order_id, status: target });
  }

  function confirmPickup() {
    if (!pending) return;
    update.mutate({
      orderId: pending.order.order_id,
      status: pending.target,
      pickupCode: code.trim(),
    });
  }

  const all = orders.data ?? [];
  const query = search.trim();
  const shown = all.filter(
    (o) =>
      (status === "all" || o.status === status) &&
      (!rxOnly || o.prescription_id !== null) &&
      (!query ||
        String(o.order_id).includes(query) ||
        String(o.customer_id).includes(query)),
  );

  // Same actions in the table (desktop) and the cards (phone).
  function actions(order: Order) {
    return nextStatuses(order.status).map((target) => (
      <Button
        key={target}
        size="sm"
        variant={target === "cancelled" ? "outline" : "default"}
        disabled={update.isPending}
        onClick={() => move(order, target)}
        aria-label={t(`order.status.${target}`)}
        title={t(`order.status.${target}`)}
      >
        {target === "cancelled" ? <XIcon /> : <CheckIcon />}
        {t(`order.status.${target}`)}
      </Button>
    ));
  }

  return (
    <div className="flex flex-col gap-4">
      {orders.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("staff.errors.generic")}
        </p>
      ) : null}
      {update.isError && !pending ? (
        <p role="alert" className="text-sm text-destructive">
          {t(staffErrorKey(update.error))}
        </p>
      ) : null}

      {orders.data && all.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("list.searchOrders")}
            aria-label={t("list.searchOrders")}
            className="sm:w-64"
          />
          <NativeSelect
            aria-label={t("orders.filter")}
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus | "all")}
            className="sm:w-48"
          >
            <NativeSelectOption value="all">
              {t("orders.allStatuses")}
            </NativeSelectOption>
            {STATUSES.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {t(`order.status.${s}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Toggle
            variant="outline"
            pressed={rxOnly}
            onPressedChange={setRxOnly}
            className="gap-1.5"
          >
            {t("list.rxOnly")}
          </Toggle>
          <p
            aria-live="polite"
            className="text-sm text-muted-foreground sm:ml-auto"
          >
            {t("catalog.found", { count: shown.length })}
          </p>
        </div>
      ) : null}

      {orders.isPending ? (
        <SkeletonList rows={4} label={t("catalog.loading")} />
      ) : null}

      {orders.data && all.length === 0 ? (
        <ListEmpty
          icon={PackageIcon}
          title={t("list.orders.title")}
          description={t("list.orders.hint")}
        />
      ) : null}
      {all.length > 0 && shown.length === 0 ? (
        <ListEmpty icon={PackageIcon} title={t("list.noMatch")}>
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setStatus("all");
              setRxOnly(false);
            }}
          >
            {t("list.reset")}
          </Button>
        </ListEmpty>
      ) : null}

      {shown.length > 0 ? (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("staff.orders.status")}</TableHead>
                  <TableHead>{t("staff.orders.total")}</TableHead>
                  <TableHead>{t("staff.orders.created")}</TableHead>
                  <TableHead className="text-right">
                    {t("staff.orders.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((order) => (
                  <TableRow key={order.order_id}>
                    <TableCell className="font-medium">
                      {order.order_id}
                      {order.prescription_id ? (
                        <span className="ml-2 text-xs text-amber-600">Rx</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={BADGE[order.status]}>
                        {t(`order.status.${order.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatPrice(order.total_amount, i18n.language)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(order.created_at, i18n.language)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {actions(order)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {shown.map((order) => (
              <li
                key={order.order_id}
                className="flex flex-col gap-3 rounded-2xl border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    #{order.order_id}
                    {order.prescription_id ? (
                      <span className="ml-2 text-xs text-amber-600">Rx</span>
                    ) : null}
                  </span>
                  <Badge variant={BADGE[order.status]}>
                    {t(`order.status.${order.status}`)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span className="font-medium tabular-nums text-foreground">
                    {formatPrice(order.total_amount, i18n.language)}
                  </span>
                  <span>{formatDateTime(order.created_at, i18n.language)}</span>
                </div>
                {nextStatuses(order.status).length > 0 ? (
                  <div className="flex flex-wrap gap-2">{actions(order)}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
            setCode("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("staff.orders.pickupTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("staff.orders.pickupHint")}
          </p>
          <Input
            aria-label={t("staff.orders.pickupCode")}
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
          />
          {update.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {t(staffErrorKey(update.error))}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              onClick={confirmPickup}
              disabled={code.trim().length !== 6 || update.isPending}
            >
              {t("staff.orders.confirmPickup")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
