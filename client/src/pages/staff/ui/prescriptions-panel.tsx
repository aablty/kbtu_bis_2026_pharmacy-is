import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, ExternalLinkIcon, FileTextIcon, XIcon } from "lucide-react";
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
import { PrescriptionDetailSheet } from "./prescription-detail-sheet";

const BADGE: Record<
  PrescriptionStatus,
  "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  approved: "secondary",
  rejected: "destructive",
};

// Shared between the desktop table and the mobile cards. `withEmail=false`
// drops the mailto link so this can be nested inside a <button> (the mobile
// card's click target) without putting interactive content inside interactive content.
function CustomerInfo({
  prescription: p,
  withEmail = true,
}: {
  prescription: Prescription;
  withEmail?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      <span className="text-foreground">
        {p.customer_name ?? t("staff.orders.customerId", { id: p.customer_id })}
      </span>
      {withEmail && p.customer_email ? (
        <a
          href={`mailto:${p.customer_email}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-primary underline underline-offset-2"
        >
          {p.customer_email}
        </a>
      ) : null}
    </div>
  );
}

export function PrescriptionsPanel() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const role = useSessionStore((state) => state.user?.role);
  const canReview = role === "admin" || role === "pharmacist";
  const [filter, setFilter] = useState<PrescriptionStatus | "all">("pending");
  const [rejecting, setRejecting] = useState<Prescription | null>(null);
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);

  const prescriptions = useQuery({
    queryKey: ["staff-prescriptions"],
    queryFn: prescriptionEndpoints.list,
  });
  // Keep the open sheet in sync with the list after a review instead of
  // holding its own stale copy of the prescription.
  const detailPrescription =
    prescriptions.data?.find((p) => p.prescription_id === detailId) ?? null;

  const review = useMutation({
    mutationFn: (vars: { id: number; approve: boolean; reason?: string }) =>
      staffEndpoints.prescriptions.review(vars.id, vars.approve, vars.reason),
    onSuccess: () => {
      setRejecting(null);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: ["staff-prescriptions"] });
    },
  });

  const rxQuery = search.trim();
  const shown = (prescriptions.data ?? []).filter(
    (p) =>
      (filter === "all" || p.status === filter) &&
      (!rxQuery ||
        String(p.prescription_id).includes(rxQuery) ||
        String(p.customer_id).includes(rxQuery)),
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
          onClick={(e) => e.stopPropagation()}
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
              onClick={(e) => {
                e.stopPropagation();
                review.mutate({ id: p.prescription_id, approve: true });
              }}
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
              onClick={(e) => {
                e.stopPropagation();
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("list.searchPrescriptions")}
          aria-label={t("list.searchPrescriptions")}
          className="sm:w-64"
        />
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
      {prescriptions.data && prescriptions.data.length === 0 ? (
        <ListEmpty
          icon={FileTextIcon}
          title={t("list.prescriptions.title")}
          description={t("list.prescriptions.hint")}
        />
      ) : null}
      {prescriptions.data &&
      prescriptions.data.length > 0 &&
      shown.length === 0 ? (
        <ListEmpty icon={FileTextIcon} title={t("list.noMatch")}>
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
          >
            {t("list.reset")}
          </Button>
        </ListEmpty>
      ) : null}
      <div className={shown.length === 0 ? "hidden" : "hidden md:block"}>
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
              <TableRow
                key={p.prescription_id}
                className="cursor-pointer"
                tabIndex={0}
                role="button"
                aria-label={t("staff.prescriptions.viewDetails", {
                  customer:
                    p.customer_name ??
                    t("staff.orders.customerId", { id: p.customer_id }),
                })}
                onClick={() => setDetailId(p.prescription_id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailId(p.prescription_id);
                  }
                }}
              >
                <TableCell className="font-medium">
                  {p.prescription_id}
                </TableCell>
                <TableCell>
                  <CustomerInfo prescription={p} />
                </TableCell>
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
            <button
              type="button"
              className="flex flex-col gap-3 text-left"
              onClick={() => setDetailId(p.prescription_id)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">#{p.prescription_id}</span>
                <Badge variant={BADGE[p.status]}>
                  {t(`prescriptions.status.${p.status}`)}
                </Badge>
              </div>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <CustomerInfo prescription={p} withEmail={false} />
                <span>{formatDateTime(p.created_at, i18n.language)}</span>
                {p.rejection_reason ? (
                  <span className="text-destructive">{p.rejection_reason}</span>
                ) : null}
              </div>
            </button>
            {p.customer_email ? (
              <a
                href={`mailto:${p.customer_email}`}
                className="-mt-2 text-xs text-primary underline underline-offset-2"
              >
                {p.customer_email}
              </a>
            ) : null}
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
              {review.isPending
                ? t("staff.prescriptions.rejecting")
                : t("staff.prescriptions.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrescriptionDetailSheet
        prescription={detailPrescription}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        renderActions={(p) => actions(p)}
      />
    </div>
  );
}
