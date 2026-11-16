import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  adminEndpoints,
  type Batch,
  catalogEndpoints,
  type Medicine,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";

export function StockPanel() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [received, setReceived] = useState<Batch | null>(null);

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

  if (received) {
    return (
      <div className="flex max-w-md flex-col gap-4 rounded-2xl border p-4">
        <p className="text-sm text-muted-foreground">
          {t("staff.stock.received")}
        </p>
        <p className="font-mono text-xl font-semibold tracking-wide">
          {received.barcode}
        </p>
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
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stock-medicine-search">
          {t("staff.stock.searchMedicine")}
        </Label>
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
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">
          {t("staff.stock.selectedMedicine")}
        </span>
        {medicine ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border p-2 text-sm">
            <span className="min-w-0 truncate font-medium">
              {medicine.name}
            </span>
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
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stock-supplier">{t("staff.stock.supplier")}</Label>
        <NativeSelect
          id="stock-supplier"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          <NativeSelectOption value="">{t("admin.none")}</NativeSelectOption>
          {(suppliers.data ?? []).map((s) => (
            <NativeSelectOption
              key={s.supplier_id}
              value={String(s.supplier_id)}
            >
              {s.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stock-quantity">{t("staff.stock.quantity")}</Label>
        <Input
          id="stock-quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stock-expiry">{t("staff.stock.expiryDate")}</Label>
        <Input
          id="stock-expiry"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
        />
      </div>

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
    </div>
  );
}
