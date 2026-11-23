import { useTranslation } from "react-i18next";
import { formatPrice } from "@/features/browse-catalog";
import type { OrderItem } from "@/shared/api";
import { QrCode } from "@/shared/ui/qr-code";

/** Items with their batch-traceability info - shared by the customer order
 * page and the staff order detail view so they render identically. */
export function OrderItemsList({ items }: { items: OrderItem[] }) {
  const { t, i18n } = useTranslation();

  return (
    <ul className="flex flex-col divide-y">
      {items.map((item) => (
        <li
          key={item.order_item_id}
          className="flex flex-col gap-2 py-2 text-sm"
        >
          <div className="flex justify-between gap-4">
            <span className="min-w-0">
              {item.medicine_name}
              <span className="text-muted-foreground"> × {item.quantity}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {formatPrice(
                String(Number(item.unit_price) * item.quantity),
                i18n.language,
              )}
            </span>
          </div>
          {item.batches && item.batches.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                {t("order.batches.title")}
              </p>
              <ul className="flex flex-col gap-3">
                {item.batches.map((batch) => (
                  <li
                    key={batch.batch_id}
                    className="flex flex-wrap items-center gap-3"
                  >
                    {batch.barcode ? (
                      <QrCode barcode={batch.barcode} size={72} />
                    ) : null}
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">
                        {t("order.batches.quantity")}
                      </dt>
                      <dd>{batch.quantity}</dd>
                      <dt className="text-muted-foreground">
                        {t("order.batches.supplier")}
                      </dt>
                      <dd>{batch.supplier_name}</dd>
                      <dt className="text-muted-foreground">
                        {t("order.batches.expiry")}
                      </dt>
                      <dd>
                        {new Date(batch.expiry_date).toLocaleDateString(
                          i18n.language,
                        )}
                      </dd>
                    </dl>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
