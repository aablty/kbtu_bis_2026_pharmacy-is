import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, ExternalLinkIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type Prescription,
  type PrescriptionStatus,
  prescriptionEndpoints,
  staffEndpoints,
} from "@/shared/api";
import { useSessionStore } from "@/shared/auth";
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

const BADGE: Record<
  PrescriptionStatus,
  "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  approved: "secondary",
  rejected: "destructive",
};

export function PrescriptionsPanel() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const role = useSessionStore((state) => state.user?.role);
  const canReview = role === "admin" || role === "pharmacist";
  const [filter, setFilter] = useState<PrescriptionStatus | "all">("pending");
  const [rejecting, setRejecting] = useState<Prescription | null>(null);
  const [reason, setReason] = useState("");

  const prescriptions = useQuery({
    queryKey: ["staff-prescriptions"],
    queryFn: prescriptionEndpoints.list,
  });

  const review = useMutation({
    mutationFn: (vars: { id: number; approve: boolean; reason?: string }) =>
      staffEndpoints.prescriptions.review(vars.id, vars.approve, vars.reason),
    onSuccess: () => {
      setRejecting(null);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["staff-prescriptions"] });
    },
  });

  const shown = (prescriptions.data ?? []).filter(
    (p) => filter === "all" || p.status === filter,
  );

  function confirmReject() {
    if (!rejecting || !reason.trim()) return;
    review.mutate({
      id: rejecting.prescription_id,
      approve: false,
      reason: reason.trim(),
    });
  }

  // Same actions in the table (desktop) and the cards (phone).
  function actions(p: Prescription) {
    return (
      <>
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label={t("prescriptions.open")}
        >
          <a href={p.file_url} target="_blank" rel="noreferrer">
            <ExternalLinkIcon />
          </a>
        </Button>
        {canReview && p.status === "pending" ? (
          <>
            <Button
              size="sm"
              disabled={review.isPending}
              aria-label={t("staff.prescriptions.approve")}
              title={t("staff.prescriptions.approve")}
              onClick={() =>
                review.mutate({ id: p.prescription_id, approve: true })
              }
            >
              <CheckIcon />
              {t("staff.prescriptions.approve")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={review.isPending}
              aria-label={t("staff.prescriptions.reject")}
              title={t("staff.prescriptions.reject")}
              onClick={() => {
                review.reset();
                setRejecting(p);
              }}
            >
              <XIcon />
              {t("staff.prescriptions.reject")}
            </Button>
          </>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <NativeSelect
          aria-label={t("staff.prescriptions.filter")}
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as PrescriptionStatus | "all")
          }
          className="w-full sm:w-48"
        >
          <NativeSelectOption value="pending">
            {t("prescriptions.status.pending")}
          </NativeSelectOption>
          <NativeSelectOption value="approved">
            {t("prescriptions.status.approved")}
          </NativeSelectOption>
          <NativeSelectOption value="rejected">
            {t("prescriptions.status.rejected")}
          </NativeSelectOption>
          <NativeSelectOption value="all">
            {t("staff.prescriptions.all")}
          </NativeSelectOption>
        </NativeSelect>
      </div>

      {review.isError && !rejecting ? (
        <p role="alert" className="text-sm text-destructive">
          {t("staff.errors.generic")}
        </p>
      ) : null}

      {prescriptions.isPending ? (
        <SkeletonList rows={4} label={t("catalog.loading")} />
      ) : null}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>{t("staff.prescriptions.customer")}</TableHead>
              <TableHead>{t("staff.orders.created")}</TableHead>
              <TableHead>{t("staff.orders.status")}</TableHead>
              <TableHead className="text-right">
                {t("staff.orders.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((p) => (
              <TableRow key={p.prescription_id}>
                <TableCell className="font-medium">
                  {p.prescription_id}
                </TableCell>
                <TableCell className="tabular-nums">{p.customer_id}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(p.created_at, i18n.language)}
                </TableCell>
                <TableCell>
                  <Badge variant={BADGE[p.status]}>
                    {t(`prescriptions.status.${p.status}`)}
                  </Badge>
                  {p.rejection_reason ? (
                    <p className="mt-1 text-xs text-destructive">
                      {p.rejection_reason}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">{actions(p)}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {shown.map((p) => (
          <li
            key={p.prescription_id}
            className="flex flex-col gap-3 rounded-2xl border p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">#{p.prescription_id}</span>
              <Badge variant={BADGE[p.status]}>
                {t(`prescriptions.status.${p.status}`)}
              </Badge>
            </div>
            <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
              <span>
                {t("staff.prescriptions.customer")}:{" "}
                <span className="tabular-nums text-foreground">
                  {p.customer_id}
                </span>
              </span>
              <span>{formatDateTime(p.created_at, i18n.language)}</span>
              {p.rejection_reason ? (
                <span className="text-destructive">{p.rejection_reason}</span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">{actions(p)}</div>
          </li>
        ))}
      </ul>

      <Dialog
        open={rejecting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("staff.prescriptions.rejectTitle")}</DialogTitle>
          </DialogHeader>
          <Input
            aria-label={t("staff.prescriptions.reason")}
            placeholder={t("staff.prescriptions.reason")}
            maxLength={255}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {review.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {t("staff.errors.generic")}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!reason.trim() || review.isPending}
            >
              {t("staff.prescriptions.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
