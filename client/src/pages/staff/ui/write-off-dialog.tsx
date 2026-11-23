import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getByBarcodeBatchesByBarcodeBarcodeGet,
  useWriteOffBatchBatchesBatchIdWriteOffPost,
} from "@/shared/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

export function WriteOffDialog() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lookupBarcode, setLookupBarcode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const lookup = useQuery({
    queryKey: ["batch-by-barcode", lookupBarcode],
    queryFn: () => getByBarcodeBatchesByBarcodeBarcodeGet(lookupBarcode),
    enabled: lookupBarcode.length > 0,
    retry: false,
  });

  const writeOff = useWriteOffBatchBatchesBatchIdWriteOffPost({
    mutation: {
      onSuccess: () => {
        toast.success(t("staff.stock.writeOff.success"));
        void queryClient.invalidateQueries({ queryKey: ["admin-medicines"] });
        void queryClient.invalidateQueries({ queryKey: ["analytics"] });
        // These two hooks are orval-generated: their query keys are the raw
        // endpoint URL, not this file's own naming convention.
        void queryClient.invalidateQueries({
          queryKey: ["/batches/receiving-activity"],
        });
        void queryClient.invalidateQueries({
          queryKey: ["/analytics/wastage"],
        });
        reset();
      },
    },
  });

  function reset() {
    setOpen(false);
    setBarcodeInput("");
    setLookupBarcode("");
    setQuantity("");
    setReason("");
    writeOff.reset();
  }

  const batch = lookup.data;
  const quantityNum = Number(quantity);
  const quantityValid =
    !!batch &&
    Number.isInteger(quantityNum) &&
    quantityNum > 0 &&
    quantityNum <= batch.quantity_remaining;

  function submit() {
    if (!batch || !quantityValid) return;
    writeOff.mutate({
      batchId: batch.batch_id,
      data: { quantity: quantityNum, reason: reason.trim() || undefined },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">{t("staff.stock.writeOff.trigger")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("staff.stock.writeOff.title")}</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="write-off-barcode">
              {t("staff.stock.writeOff.barcode")}
            </FieldLabel>
            <Input
              id="write-off-barcode"
              value={barcodeInput}
              placeholder={t("staff.stock.writeOff.barcodePlaceholder")}
              onChange={(e) => {
                setBarcodeInput(e.target.value);
                setLookupBarcode(e.target.value.trim());
              }}
              aria-invalid={
                lookupBarcode.length > 0 && !lookup.isFetching && !batch
              }
              aria-describedby={
                lookupBarcode.length > 0 && !lookup.isFetching && !batch
                  ? "write-off-barcode-error"
                  : undefined
              }
            />
            {lookupBarcode.length > 0 && !lookup.isFetching && !batch ? (
              <FieldError id="write-off-barcode-error">
                {t("staff.stock.writeOff.notFound")}
              </FieldError>
            ) : null}
          </Field>

          {batch ? (
            <>
              <div className="flex items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                <span className="min-w-0 truncate font-medium">
                  {batch.medicine_name}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {t("staff.stock.writeOff.quantityRemaining")}:{" "}
                  {batch.quantity_remaining}
                </span>
              </div>

              <Field data-invalid={quantity !== "" && !quantityValid}>
                <FieldLabel htmlFor="write-off-quantity">
                  {t("staff.stock.writeOff.quantity")}
                </FieldLabel>
                <Input
                  id="write-off-quantity"
                  type="number"
                  min={1}
                  max={batch.quantity_remaining}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  aria-invalid={quantity !== "" && !quantityValid}
                  aria-describedby={
                    quantity !== "" && !quantityValid
                      ? "write-off-quantity-error"
                      : undefined
                  }
                />
                {quantity !== "" && !quantityValid ? (
                  <FieldError id="write-off-quantity-error">
                    {t("staff.stock.writeOff.quantityError")}
                  </FieldError>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="write-off-reason">
                  {t("staff.stock.writeOff.reason")}
                </FieldLabel>
                <Input
                  id="write-off-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
            </>
          ) : null}
        </FieldGroup>
        <DialogFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!quantityValid || writeOff.isPending}
              >
                {writeOff.isPending
                  ? t("staff.stock.writeOff.submitting")
                  : t("staff.stock.writeOff.submit")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("staff.stock.writeOff.confirmTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("staff.stock.writeOff.confirmDescription", {
                    quantity: quantityNum,
                    medicine: batch?.medicine_name ?? "",
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t("staff.stock.writeOff.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={submit}>
                  {t("staff.stock.writeOff.confirmAction")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogFooter>
        {writeOff.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {t("staff.stock.writeOff.error")}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
