import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { needsPickupCode, nextStatuses } from "../model/order-transitions";
import { staffErrorKey } from "../model/staff-error";

const BADGE: Record<OrderStatus, "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  confirmed: "secondary",
  ready: "secondary",
  completed: "secondary",
  cancelled: "destructive",
};

export function OrdersPanel() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<{
    order: Order;
    target: OrderStatus;
  } | null>(null);
  const [code, setCode] = useState("");

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
          {orders.data?.map((order) => (
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
                {Number(order.total_amount).toLocaleString(i18n.language)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateTime(order.created_at, i18n.language)}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  {nextStatuses(order.status).map((target) => (
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
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
