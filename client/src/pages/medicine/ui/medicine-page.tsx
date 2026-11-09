import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { ChevronLeftIcon, ChevronRightIcon, PackageIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import {
  categoryLabel,
  dosageFormLabel,
  formatPrice,
} from "@/features/browse-catalog";
import { CartControl, CartFab } from "@/features/cart";
import { catalogEndpoints } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/ui/breadcrumb";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import { AppShell } from "@/widgets/layout";

export function MedicinePage() {
  const { t, i18n } = useTranslation();
  const { medicineId } = useParams();
  const medicine = useQuery({
    queryKey: ["medicine", medicineId],
    queryFn: () => catalogEndpoints.medicine(Number(medicineId)),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: catalogEndpoints.categories,
  });
  const data = medicine.data;
  const category = categories.data?.find(
    (c) => c.category_id === data?.category_id,
  );
  const [selected, setSelected] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const images = data?.image_urls ?? [];
  const current = images[selected];

  return (
    <AppShell>
      {data ? (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/catalog">{t("nav.catalog")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {category ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/catalog?category=${category.category_id}`}>
                      {categoryLabel(category, i18n.language)}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            ) : null}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-48 truncate">
                {data.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      ) : (
        <Link to="/catalog" className="text-sm text-muted-foreground underline">
          {t("medicine.back")}
        </Link>
      )}

      {medicine.isPending ? (
        <Card
          role="status"
          aria-busy="true"
          aria-label={t("catalog.loading")}
          className="mt-4 grid gap-0 overflow-hidden p-0 md:grid-cols-3"
        >
          <div className="p-4 md:col-span-2 md:p-6">
            <Skeleton className="aspect-square w-full rounded-xl md:aspect-[4/3]" />
          </div>
          <div className="flex flex-col gap-4 border-t p-6 md:border-t-0 md:border-l">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-11 w-full" />
          </div>
        </Card>
      ) : null}
      {medicine.isError ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {t("medicine.notFound")}
        </p>
      ) : null}

      {data ? (
        <Card className="mt-4 grid gap-0 overflow-hidden p-0 md:grid-cols-3">
          {/* Photos: two thirds of the width */}
          <div className="flex flex-col gap-4 bg-white p-4 md:col-span-2 md:p-6">
            <button
              type="button"
              disabled={!current}
              onClick={() => setZoomed(true)}
              aria-label={t("medicine.zoom")}
              className="group flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-white focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default md:aspect-[4/3]"
            >
              {current ? (
                <img
                  src={current}
                  alt={data.name}
                  referrerPolicy="no-referrer"
                  className="size-full object-contain transition-transform group-hover:scale-[1.02]"
                />
              ) : (
                <PackageIcon
                  aria-label={t("catalog.noImage")}
                  className="size-16 text-muted-foreground/40"
                />
              )}
            </button>
            {current ? (
              <p className="text-center text-xs text-muted-foreground">
                {t("medicine.zoom")}
              </p>
            ) : null}
            {images.length > 1 ? (
              <ul className="flex flex-wrap justify-center gap-2">
                {images.map((url, i) => (
                  <li key={url}>
                    <button
                      type="button"
                      onClick={() => setSelected(i)}
                      aria-label={`${data.name} ${i + 1}`}
                      aria-current={i === selected}
                      className={cn(
                        "size-16 overflow-hidden rounded-lg border bg-white p-1 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                        i === selected && "border-primary ring-1 ring-primary",
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

          {/* Information: one third of the width */}
          <div className="flex flex-col gap-5 border-t p-6 md:col-span-1 md:border-t-0 md:border-l">
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-xl leading-snug font-semibold">
                {data.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {data.manufacturer ?? "—"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant={data.stock_quantity > 0 ? "secondary" : "outline"}
              >
                {data.stock_quantity > 0
                  ? t("catalog.inStock")
                  : t("catalog.outOfStock")}
              </Badge>
              {data.requires_prescription ? (
                <Badge variant="outline">
                  {t("catalog.requiresPrescription")}
                </Badge>
              ) : null}
            </div>

            <p className="text-3xl font-semibold tabular-nums">
              {formatPrice(data.price, i18n.language)}
            </p>

            <div className="[&>button]:w-full">
              <CartControl medicine={data} />
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 border-t pt-5 text-sm">
              {data.dosage_form ? (
                <>
                  <dt className="text-muted-foreground">
                    {t("medicine.dosageForm")}
                  </dt>
                  <dd>{dosageFormLabel(data.dosage_form, t)}</dd>
                </>
              ) : null}
              {data.expiry_date ? (
                <>
                  <dt className="text-muted-foreground">
                    {t("medicine.expiry")}
                  </dt>
                  <dd>
                    {new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    }).format(new Date(data.expiry_date))}
                  </dd>
                </>
              ) : null}
              <dt className="text-muted-foreground">
                {t("medicine.prescription")}
              </dt>
              <dd>
                {data.requires_prescription
                  ? t("catalog.requiresPrescription")
                  : t("medicine.noPrescription")}
              </dd>
            </dl>
          </div>
        </Card>
      ) : null}

      {current ? (
        <Dialog open={zoomed} onOpenChange={setZoomed}>
          <DialogContent
            className="max-w-4xl bg-white p-4"
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setSelected((i) => Math.max(0, i - 1));
              if (e.key === "ArrowRight")
                setSelected((i) => Math.min(images.length - 1, i + 1));
            }}
          >
            <DialogTitle className="sr-only">{data?.name}</DialogTitle>
            <div className="group relative flex items-center justify-center">
              <img
                src={current}
                alt={data?.name ?? ""}
                referrerPolicy="no-referrer"
                className="max-h-[80svh] w-full object-contain"
              />
              {images.length > 1 ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 left-2 size-8 -translate-y-1/2 rounded-full bg-background/60 text-foreground opacity-60 backdrop-blur-sm transition-opacity hover:bg-background/80 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-0"
                    disabled={selected === 0}
                    onClick={() => setSelected(selected - 1)}
                    aria-label={t("catalog.prev")}
                  >
                    <ChevronLeftIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-2 size-8 -translate-y-1/2 rounded-full bg-background/60 text-foreground opacity-60 backdrop-blur-sm transition-opacity hover:bg-background/80 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-0"
                    disabled={selected === images.length - 1}
                    onClick={() => setSelected(selected + 1)}
                    aria-label={t("catalog.next")}
                  >
                    <ChevronRightIcon />
                  </Button>
                </>
              ) : null}
            </div>
            {images.length > 1 ? (
              <p className="text-center text-sm tabular-nums text-muted-foreground">
                {selected + 1} / {images.length}
              </p>
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
      <CartFab />
    </AppShell>
  );
}
