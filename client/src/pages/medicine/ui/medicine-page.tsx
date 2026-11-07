import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { PackageIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { formatPrice } from "@/features/browse-catalog";
import { CartControl } from "@/features/cart";
import { catalogEndpoints } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { AppShell } from "@/widgets/layout";

export function MedicinePage() {
  const { t, i18n } = useTranslation();
  const { medicineId } = useParams();
  const medicine = useQuery({
    queryKey: ["medicine", medicineId],
    queryFn: () => catalogEndpoints.medicine(Number(medicineId)),
  });
  const data = medicine.data;
  const [selected, setSelected] = useState(0);
  const images = data?.image_urls ?? [];

  return (
    <AppShell>
      <Link to="/catalog" className="text-sm text-muted-foreground underline">
        {t("medicine.back")}
      </Link>

      {medicine.isPending ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          {t("catalog.loading")}
        </p>
      ) : null}
      {medicine.isError ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {t("medicine.notFound")}
        </p>
      ) : null}

      {data ? (
        <Card className="mt-4 max-w-3xl md:flex-row">
          <div className="flex shrink-0 flex-col gap-3 p-6 md:w-72">
            <div className="flex aspect-square items-center justify-center rounded-xl bg-muted/40 p-4">
              {images[selected] ? (
                <img
                  src={images[selected]}
                  alt={data.name}
                  referrerPolicy="no-referrer"
                  className="size-full object-contain"
                />
              ) : (
                <PackageIcon
                  aria-label={t("catalog.noImage")}
                  className="size-16 text-muted-foreground/40"
                />
              )}
            </div>
            {images.length > 1 ? (
              <ul className="flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <li key={url}>
                    <button
                      type="button"
                      onClick={() => setSelected(i)}
                      aria-current={i === selected}
                      className={cn(
                        "size-14 overflow-hidden rounded-lg border bg-muted/40 p-1 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                        i === selected && "border-primary",
                      )}
                    >
                      <img
                        src={url}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="size-full object-contain"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <CardHeader>
              <CardTitle className="text-xl">{data.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {data.manufacturer ?? "—"}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">
                  {t("medicine.dosageForm")}
                </dt>
                <dd>{data.dosage_form ?? "—"}</dd>
                <dt className="text-muted-foreground">{t("medicine.price")}</dt>
                <dd className="font-medium">
                  {formatPrice(data.price, i18n.language)}
                </dd>
                <dt className="text-muted-foreground">
                  {t("medicine.availability")}
                </dt>
                <dd>
                  <Badge
                    variant={data.stock_quantity > 0 ? "secondary" : "outline"}
                  >
                    {data.stock_quantity > 0
                      ? t("catalog.inStock")
                      : t("catalog.outOfStock")}
                  </Badge>
                </dd>
                <dt className="text-muted-foreground">
                  {t("medicine.prescription")}
                </dt>
                <dd>
                  {data.requires_prescription
                    ? t("catalog.requiresPrescription")
                    : t("medicine.noPrescription")}
                </dd>
              </dl>
              <CartControl medicine={data} />
            </CardContent>
          </div>
        </Card>
      ) : null}
    </AppShell>
  );
}
