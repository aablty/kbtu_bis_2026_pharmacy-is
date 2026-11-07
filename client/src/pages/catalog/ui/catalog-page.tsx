import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import {
  CheckCircle2Icon,
  FileTextIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  buildCategoryTree,
  CategoryTreeNav,
  MedicineCard,
  PageNumbers,
} from "@/features/browse-catalog";
import { CartControl } from "@/features/cart";
import { catalogEndpoints } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { Toggle } from "@/shared/ui/toggle";
import { AppShell } from "@/widgets/layout";

const PAGE_SIZE = 12;

// Pressed filters are tinted, not just outlined, so the active state reads at a glance.
const FILTER_TOGGLE =
  "gap-1.5 px-3 data-[state=on]:border-primary/40 data-[state=on]:bg-primary/15 data-[state=on]:text-primary";

const numberParam = (value: string | null) =>
  value !== null && value !== "" && Number(value) >= 0
    ? Number(value)
    : undefined;

export function CatalogPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const categoryId = Number(params.get("category")) || null;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const cursor = params.get("cursor") ?? undefined;
  const inStock = params.get("stock") === "1";
  const otcOnly = params.get("otc") === "1";
  const minPrice = numberParam(params.get("min"));
  const maxPrice = numberParam(params.get("max"));
  // Category is navigation, not a filter: clearing filters keeps it.
  const hasFilters =
    Boolean(q) ||
    inStock ||
    otcOnly ||
    minPrice !== undefined ||
    maxPrice !== undefined;

  const [priceDraft, setPriceDraft] = useState({
    min: params.get("min") ?? "",
    max: params.get("max") ?? "",
  });
  // Follow the URL when it changes from outside (clear button, back/forward).
  useEffect(() => {
    setPriceDraft({
      min: params.get("min") ?? "",
      max: params.get("max") ?? "",
    });
  }, [params]);
  // Write the typed range to the URL once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => {
      const min = priceDraft.min.trim();
      const max = priceDraft.max.trim();
      if (
        min === (params.get("min") ?? "") &&
        max === (params.get("max") ?? "")
      )
        return;
      const next = new URLSearchParams(params);
      next.delete("page");
      next.delete("cursor");
      if (min) next.set("min", min);
      else next.delete("min");
      if (max) next.set("max", max);
      else next.delete("max");
      navigate(`/catalog?${next}`);
    }, 400);
    return () => clearTimeout(timer);
  }, [priceDraft, params, navigate]);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: catalogEndpoints.categories,
  });
  const medicines = useQuery({
    queryKey: [
      "medicines",
      { q, categoryId, page, cursor, inStock, otcOnly, minPrice, maxPrice },
    ],
    queryFn: () =>
      catalogEndpoints.medicines({
        q: q || undefined,
        category_id: categoryId ?? undefined,
        in_stock: inStock || undefined,
        requires_prescription: otcOnly ? false : undefined,
        min_price: minPrice,
        max_price: maxPrice,
        limit: PAGE_SIZE,
        // A cursor (set by the "next" step) seeks past the last row; page
        // numbers jump with offset. Both rely on the same name+id ordering.
        ...(cursor
          ? { cursor, offset: 0 }
          : { offset: (page - 1) * PAGE_SIZE }),
      }),
    placeholderData: keepPreviousData,
  });

  /** Changing anything except the page resets paging; `page`/`cursor` are set explicitly. */
  function hrefFor(change: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    if (!("page" in change)) change = { ...change, page: null };
    if (!("cursor" in change)) change = { ...change, cursor: null };
    for (const [key, value] of Object.entries(change)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    return `/catalog?${next}`;
  }

  function pageHref(target: number, sequential = false) {
    const nextCursor = medicines.data?.next_cursor;
    return hrefFor({
      page: target === 1 ? null : String(target),
      cursor:
        sequential && target === page + 1 && nextCursor ? nextCursor : null,
    });
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    navigate(hrefFor({ q: q || null }));
  }

  const total = medicines.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell>
      <h1 className="font-heading mb-6 text-2xl font-semibold">
        {t("catalog.title")}
      </h1>
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="shrink-0 lg:w-60">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            {t("catalog.categories")}
          </p>
          <nav
            aria-label={t("catalog.categories")}
            className="flex flex-col gap-0.5"
          >
            <Link
              to={hrefFor({ category: null })}
              aria-current={categoryId === null ? "page" : undefined}
              className={cn(
                "block rounded-md py-1 pr-2 pl-9 text-sm hover:bg-accent",
                categoryId === null
                  ? "bg-accent font-semibold text-primary"
                  : "text-muted-foreground",
              )}
            >
              {t("catalog.allCategories")}
            </Link>
            {categories.data ? (
              <CategoryTreeNav
                nodes={buildCategoryTree(categories.data)}
                selectedId={categoryId}
                hrefFor={(id) => hrefFor({ category: String(id) })}
              />
            ) : null}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <search>
            <form onSubmit={onSearch} className="flex gap-2">
              <Label htmlFor="catalog-search" className="sr-only">
                {t("catalog.search")}
              </Label>
              <Input
                key={q}
                id="catalog-search"
                name="q"
                type="search"
                defaultValue={q}
                placeholder={t("catalog.search")}
                className="min-w-48 flex-1"
              />
              <Button
                type="submit"
                size="icon"
                aria-label={t("catalog.searchSubmit")}
                title={t("catalog.searchSubmit")}
              >
                <SearchIcon />
              </Button>
            </form>
          </search>

          <div className="flex flex-wrap items-center gap-2">
            <Toggle
              variant="outline"
              pressed={inStock}
              onPressedChange={(on) =>
                navigate(hrefFor({ stock: on ? "1" : null }))
              }
              className={FILTER_TOGGLE}
            >
              <CheckCircle2Icon />
              {t("catalog.inStockOnly")}
            </Toggle>
            <Toggle
              variant="outline"
              pressed={otcOnly}
              onPressedChange={(on) =>
                navigate(hrefFor({ otc: on ? "1" : null }))
              }
              className={FILTER_TOGGLE}
            >
              <span className="relative flex">
                <FileTextIcon />
                <span
                  aria-hidden
                  className="absolute top-1/2 -left-0.5 h-0.5 w-5 -rotate-45 rounded bg-current"
                />
              </span>
              {t("catalog.otcOnly")}
            </Toggle>
            <div className="flex items-center gap-2">
              <Input
                name="min"
                type="number"
                min={0}
                inputMode="numeric"
                value={priceDraft.min}
                onChange={(e) =>
                  setPriceDraft({ ...priceDraft, min: e.target.value })
                }
                placeholder={t("catalog.minPrice")}
                aria-label={t("catalog.minPrice")}
                className="w-28"
              />
              <span aria-hidden className="text-muted-foreground">
                —
              </span>
              <Input
                name="max"
                type="number"
                min={0}
                inputMode="numeric"
                value={priceDraft.max}
                onChange={(e) =>
                  setPriceDraft({ ...priceDraft, max: e.target.value })
                }
                placeholder={t("catalog.maxPrice")}
                aria-label={t("catalog.maxPrice")}
                className="w-28"
              />
            </div>
            {hasFilters ? (
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label={t("catalog.clearFilters")}
                title={t("catalog.clearFilters")}
              >
                <Link
                  to={hrefFor({
                    q: null,
                    stock: null,
                    otc: null,
                    min: null,
                    max: null,
                  })}
                >
                  <XIcon />
                </Link>
              </Button>
            ) : null}
          </div>

          {medicines.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {t("catalog.error")}
            </p>
          ) : null}
          {medicines.isPending ? (
            <ul
              aria-busy
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
            >
              {Array.from({ length: 6 }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeletons
                <li key={i}>
                  <Skeleton className="aspect-3/4 w-full rounded-2xl" />
                </li>
              ))}
            </ul>
          ) : null}
          {medicines.data && medicines.data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("catalog.empty")}
            </p>
          ) : null}

          {medicines.data && medicines.data.items.length > 0 ? (
            <ul
              className={cn(
                "grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 md:grid-cols-3",
                medicines.isPlaceholderData && "opacity-60",
              )}
            >
              {medicines.data.items.map((medicine) => (
                <li key={medicine.medicine_id}>
                  <MedicineCard
                    medicine={medicine}
                    action={<CartControl medicine={medicine} compact />}
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {medicines.data && total > PAGE_SIZE ? (
            <PageNumbers page={page} lastPage={lastPage} hrefFor={pageHref} />
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
