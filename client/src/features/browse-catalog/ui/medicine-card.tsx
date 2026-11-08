import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import type { Medicine } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { formatPrice } from "../model/format-price";
import { ImageStrip } from "./image-strip";

/** `action` is rendered beside the price, above the card link (e.g. the cart control). */
export function MedicineCard({
  medicine,
  action,
}: {
  medicine: Medicine;
  action?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const href = `/catalog/${medicine.medicine_id}`;
  const inStock = medicine.stock_quantity > 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all focus-within:ring-[3px] focus-within:ring-ring/50 hover:shadow-md">
      <div className="relative z-10 aspect-[4/3] shrink-0 overflow-hidden bg-white">
        <ImageStrip urls={medicine.image_urls} onClick={() => navigate(href)} />
        <Badge
          variant={inStock ? "secondary" : "outline"}
          className="pointer-events-none absolute top-2 left-2 gap-1 bg-background/90"
        >
          {inStock ? <CheckCircle2Icon /> : <XCircleIcon />}
          {inStock ? t("catalog.inStock") : t("catalog.outOfStock")}
        </Badge>
        {medicine.requires_prescription ? (
          <Badge
            title={t("catalog.requiresPrescription")}
            className="pointer-events-none absolute right-0 bottom-0 z-10 rounded-none rounded-tl-md bg-sky-500 text-white shadow-sm hover:bg-sky-500"
          >
            {t("catalog.prescriptionBadge")}
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="min-h-10 text-sm leading-5 font-medium">
          <Link
            to={href}
            className="line-clamp-2 outline-none after:absolute after:inset-0"
          >
            {medicine.name}
          </Link>
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {medicine.manufacturer ?? "—"}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <span className="text-lg font-semibold tabular-nums">
            {formatPrice(medicine.price, i18n.language)}
          </span>
          {action ? <div className="relative z-10">{action}</div> : null}
        </div>
      </div>
    </article>
  );
}
