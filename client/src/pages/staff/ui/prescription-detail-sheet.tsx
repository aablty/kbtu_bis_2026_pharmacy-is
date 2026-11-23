import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Prescription, PrescriptionStatus } from "@/shared/api";
import { fileKindFromUrl } from "@/shared/lib/file-kind";
import { formatDateTime } from "@/shared/lib/format-date";
import { Badge } from "@/shared/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";

const BADGE: Record<
  PrescriptionStatus,
  "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  approved: "secondary",
  rejected: "destructive",
};

export function PrescriptionDetailSheet({
  prescription,
  onOpenChange,
  renderActions,
}: {
  prescription: Prescription | null;
  onOpenChange: (open: boolean) => void;
  renderActions: (prescription: Prescription) => ReactNode;
}) {
  const { t, i18n } = useTranslation();

  return (
    <Sheet open={prescription !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        {prescription ? (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
                <SheetTitle>
                  {t("prescriptions.open")} #{prescription.prescription_id}
                </SheetTitle>
                <Badge variant={BADGE[prescription.status]}>
                  {t(`prescriptions.status.${prescription.status}`)}
                </Badge>
              </div>
            </SheetHeader>
            <div className="flex flex-col gap-4 overflow-y-auto px-6">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">
                  {t("staff.prescriptions.customer")}
                </dt>
                <dd>
                  {prescription.customer_name ??
                    prescription.customer_email ??
                    t("staff.orders.customerId", {
                      id: prescription.customer_id,
                    })}
                </dd>
                <dt className="text-muted-foreground">
                  {t("staff.orders.created")}
                </dt>
                <dd>
                  {formatDateTime(prescription.created_at, i18n.language)}
                </dd>
              </dl>

              {prescription.rejection_reason ? (
                <p className="text-sm text-destructive">
                  {t("prescriptions.reason", {
                    reason: prescription.rejection_reason,
                  })}
                </p>
              ) : null}

              <PrescriptionFile fileUrl={prescription.file_url} />
            </div>
            <SheetFooter className="flex-row flex-wrap gap-2">
              {renderActions(prescription)}
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function PrescriptionFile({ fileUrl }: { fileUrl: string }) {
  const { t } = useTranslation();
  const kind = fileKindFromUrl(fileUrl);

  if (kind === "pdf") {
    return (
      <div className="flex flex-col gap-2">
        <iframe
          src={fileUrl}
          title={t("prescriptions.open")}
          className="h-96 w-full rounded-lg border"
        />
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary underline underline-offset-2"
        >
          {t("prescriptions.open")}
        </a>
      </div>
    );
  }

  return (
    <a href={fileUrl} target="_blank" rel="noreferrer">
      <img
        src={fileUrl}
        alt={t("prescriptions.open")}
        className="max-h-96 w-full rounded-lg border object-contain"
      />
    </a>
  );
}
