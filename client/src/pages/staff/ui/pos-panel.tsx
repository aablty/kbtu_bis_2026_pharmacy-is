import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatPrice } from "@/features/browse-catalog";
import {
  catalogEndpoints,
  type Medicine,
  type Sale,
  staffEndpoints,
} from "@/shared/api";
import { formatDateTime } from "@/shared/lib/format-date";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

interface Line {
  medicine: Medicine;
  quantity: number;
}

export function PosPanel() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const recent = useQuery({
    queryKey: ["staff-sales"],
    queryFn: staffEndpoints.sales.list,
  });

  const results = useQuery({
    queryKey: ["pos-search", query],
    queryFn: () =>
      catalogEndpoints.medicines({ q: query, limit: 10, offset: 0 }),
    enabled: query.length >= 2,
  });

  const sell = useMutation({
    mutationFn: staffEndpoints.sales.create,
    onSuccess: (sale) => {
      setReceipt(sale);
      setLines([]);
      setCustomerId("");
      void queryClient.invalidateQueries({ queryKey: ["staff-sales"] });
      void queryClient.invalidateQueries({ queryKey: ["medicines"] });
      void queryClient.invalidateQueries({ queryKey: ["medicine"] });
    },
  });

  function add(medicine: Medicine) {
    setReceipt(null);
    sell.reset();
    setLines((prev) => {
      const existing = prev.find(
        (l) => l.medicine.medicine_id === medicine.medicine_id,
      );
      if (!existing) return [...prev, { medicine, quantity: 1 }];
      return prev.map((l) =>
        l === existing
          ? {
              ...l,
              quantity: Math.min(l.quantity + 1, medicine.stock_quantity),
            }
          : l,
      );
    });
  }

  function setQuantity(medicineId: number, quantity: number) {
    setLines((prev) =>
      prev
        .map((l) =>
          l.medicine.medicine_id === medicineId ? { ...l, quantity } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  }

  const total = lines.reduce(
    (sum, l) => sum + Number(l.medicine.price) * l.quantity,
    0,
  );
  const valid = lines.length > 0 && lines.every((l) => l.quantity > 0);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
      <section className="flex flex-col gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
          }}
          className="flex gap-2"
        >
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("staff.pos.search")}
            aria-label={t("staff.pos.search")}
          />
          <Button type="submit" variant="outline">
            {t("catalog.searchSubmit")}
          </Button>
        </form>
        <ul className="flex flex-col divide-y rounded-xl border">
          {results.data?.items.map((m) => (
            <li
              key={m.medicine_id}
              className="flex items-center justify-between gap-3 p-3 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{m.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatPrice(m.price, i18n.language)} · {t("staff.pos.stock")}
                  : {m.stock_quantity}
                </span>
              </span>
              <Button
                size="icon-sm"
                variant="outline"
                disabled={m.stock_quantity <= 0}
                aria-label={t("staff.pos.add")}
                title={t("staff.pos.add")}
                onClick={() => add(m)}
              >
                <PlusIcon />
              </Button>
            </li>
          ))}
        </ul>
        <h2 className="mt-2 text-sm font-medium">{t("staff.pos.recent")}</h2>
        <ul className="flex flex-col divide-y rounded-xl border">
          {recent.data?.slice(0, 10).map((sale) => (
            <li
              key={sale.sale_id}
              className="flex items-center justify-between gap-3 p-3 text-sm"
            >
              <span>
                #{sale.sale_id}
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatDateTime(sale.created_at, i18n.language)}
                </span>
              </span>
              <span className="tabular-nums">
                {formatPrice(sale.total_amount, i18n.language)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <aside className="flex flex-col gap-3 rounded-2xl border p-4">
        <h2 className="text-sm font-medium">{t("staff.pos.sale")}</h2>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("staff.pos.empty")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lines.map((l) => (
              <li
                key={l.medicine.medicine_id}
                className="flex items-center gap-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  {l.medicine.name}
                </span>
                <Input
                  type="number"
                  min={1}
                  max={l.medicine.stock_quantity}
                  aria-label={t("staff.pos.quantity")}
                  value={l.quantity}
                  onChange={(e) =>
                    setQuantity(l.medicine.medicine_id, Number(e.target.value))
                  }
                  className="w-16"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("cart.remove")}
                  onClick={() => setQuantity(l.medicine.medicine_id, 0)}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          placeholder={t("staff.pos.customer")}
          aria-label={t("staff.pos.customer")}
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        />
        <div className="flex items-baseline justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">
            {t("cart.subtotal")}
          </span>
          <span className="font-semibold tabular-nums">
            {formatPrice(String(total), i18n.language)}
          </span>
        </div>
        <Button
          disabled={!valid || sell.isPending}
          onClick={() =>
            sell.mutate({
              items: lines.map((l) => ({
                medicine_id: l.medicine.medicine_id,
                quantity: l.quantity,
              })),
              customer_id: customerId ? Number(customerId) : null,
            })
          }
        >
          {sell.isPending ? t("staff.pos.selling") : t("staff.pos.submit")}
        </Button>
        {sell.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {t("staff.errors.generic")}
          </p>
        ) : null}
        {receipt ? (
          <p role="status" className="text-sm text-primary">
            {t("staff.pos.receipt", {
              id: receipt.sale_id,
              total: formatPrice(receipt.total_amount, i18n.language),
            })}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
