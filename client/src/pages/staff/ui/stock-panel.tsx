import { useMutation, useQuery } from "@tanstack/react-query";
import { PackageCheckIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  adminEndpoints,
  type Batch,
  catalogEndpoints,
  type Medicine,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ButtonGroup } from "@/shared/ui/button-group";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { QrCode } from "@/shared/ui/qr-code";
import { WriteOffDialog } from "./write-off-dialog";

const QUANTITY_STEPS = [-10, -1, 1, 10] as const;

export function StockPanel() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [received, setReceived] = useState<Batch | null>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  // Guided flow: once a medicine is confirmed, move the operator straight
  // into the receiving details instead of leaving them to find the field.
  useEffect(() => {
    if (medicine) quantityRef.current?.focus();
  }, [medicine]);

  const suppliers = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: adminEndpoints.suppliers.list,
  });
  const results = useQuery({
    queryKey: ["stock-medicine-search", query],
    queryFn: () =>
      catalogEndpoints.medicines({ q: query, limit: 10, offset: 0 }),
    enabled: query.length >= 2,
  });

  const receive = useMutation({
    mutationFn: adminEndpoints.batches.create,
    onSuccess: (batch) => {
      setReceived(batch);
      setMedicine(null);
      setSupplierId("");
      setQuantity("");
      setExpiryDate("");
    },
  });

  const valid =
    medicine !== null &&
    supplierId !== "" &&
    Number(quantity) > 0 &&
    expiryDate !== "";

  function submit() {
    if (!medicine || !valid) return;
    receive.mutate({
      medicine_id: medicine.medicine_id,
      supplier_id: Number(supplierId),
      quantity: Number(quantity),
      expiry_date: expiryDate,
    });
  }

  function adjustQuantity(delta: number) {
    const next = Math.max(1, (Number(quantity) || 0) + delta);
    setQuantity(String(next));
  }

  if (received) {
    return (
      <div className="flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-4 rounded-2xl border p-4">
          <p className="text-sm text-muted-foreground">
            {t("staff.stock.received")}
          </p>
          {received.barcode ? (
            <QrCode barcode={received.barcode} size={128} />
          ) : null}
          <Button
            variant="outline"
            onClick={() => {
              setReceived(null);
              receive.reset();
            }}
          >
            {t("staff.stock.another")}
          </Button>
        </div>
        <WriteOffDialog />
      </div>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <WriteOffDialog />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="stock-medicine-search">
            {t("staff.stock.step1")}
          </FieldLabel>
          <Input
            id="stock-medicine-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setQuery(e.target.value.trim());
            }}
            placeholder={t("staff.stock.searchMedicine")}
          />
          {query.length >= 2 && results.data?.items.length ? (
            <ul className="flex flex-col divide-y rounded-xl border">
              {results.data.items.map((m) => (
                <li key={m.medicine_id}>
                  <button
                    type="button"
                    className="w-full p-2 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setMedicine(m);
                      setSearch("");
                      setQuery("");
                    }}
                  >
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Field>

        {medicine ? (
          <div className="flex items-center gap-3 rounded-2xl border bg-muted/30 p-4">
            <PackageCheckIcon className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{medicine.name}</p>
              <p className="text-xs text-muted-foreground">
                {t("staff.stock.currentStock", {
                  count: medicine.stock_quantity,
                })}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMedicine(null)}
            >
              {t("staff.stock.change")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("staff.stock.noneSelected")}
          </p>
        )}

        {medicine ? (
          <>
            <p className="text-sm font-medium">{t("staff.stock.step2")}</p>

            <Field>
              <FieldLabel htmlFor="stock-supplier">
                {t("staff.stock.supplier")}
              </FieldLabel>
              <NativeSelect
                id="stock-supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <NativeSelectOption value="">
                  {t("admin.none")}
                </NativeSelectOption>
                {(suppliers.data ?? []).map((s) => (
                  <NativeSelectOption
                    key={s.supplier_id}
                    value={String(s.supplier_id)}
                  >
                    {s.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <FieldLabel htmlFor="stock-quantity">
                {t("staff.stock.quantity")}
              </FieldLabel>
              <ButtonGroup>
                {QUANTITY_STEPS.slice(0, 2).map((step) => (
                  <Button
                    key={step}
                    type="button"
                    variant="outline"
                    aria-label={t("staff.stock.quantityAdjust", { step })}
                    onClick={() => adjustQuantity(step)}
                  >
                    {step}
                  </Button>
                ))}
                <Input
                  id="stock-quantity"
                  ref={quantityRef}
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="text-center"
                />
                {QUANTITY_STEPS.slice(2).map((step) => (
                  <Button
                    key={step}
                    type="button"
                    variant="outline"
                    aria-label={t("staff.stock.quantityAdjust", { step })}
                    onClick={() => adjustQuantity(step)}
                  >
                    +{step}
                  </Button>
                ))}
              </ButtonGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="stock-expiry">
                {t("staff.stock.expiryDate")}
              </FieldLabel>
              <Input
                id="stock-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </Field>

            <Button disabled={!valid || receive.isPending} onClick={submit}>
              {receive.isPending
                ? t("staff.stock.receiving")
                : t("staff.stock.submit")}
            </Button>
            {receive.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {t("staff.errors.generic")}
              </p>
            ) : null}
          </>
        ) : null}
      </FieldGroup>
    </div>
  );
}
