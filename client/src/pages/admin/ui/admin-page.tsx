import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import {
  BarChart3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  FolderTreeIcon,
  MinusCircleIcon,
  PackageIcon,
  PillIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  TruckIcon,
} from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  buildCategoryTree,
  type CategoryNode,
  categoryLabel,
  dosageFormLabel,
  formatPrice,
} from "@/features/browse-catalog";
import {
  adminEndpoints,
  type Category,
  type CategoryInput,
  catalogEndpoints,
  type Medicine,
  type MedicineInput,
  type Supplier,
  type SupplierInput,
} from "@/shared/api";
import type { DosageForm } from "@/shared/api/catalog-types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { AppShell } from "@/widgets/layout";
import { AnalyticsPanel } from "./analytics-panel";
import {
  type CrudColumn,
  CrudPanel,
  type FieldDef,
  type Values,
} from "./crud-panel";
import { ReceivingActivityPanel } from "./receiving-activity-panel";
import { WastagePanel } from "./wastage-panel";

const PAGE_SIZE = 50;
const DOSAGE_FORMS: DosageForm[] = [
  "ampoules",
  "aerosol",
  "balm",
  "gel",
  "granules",
  "dragee",
  "chewing_gum",
  "drops",
  "capsules",
  "vaginal_capsules",
  "pencil",
  "concentrate",
  "cream",
  "lacquer",
  "lozenges",
  "lotion",
  "ointment",
  "oil",
  "tincture",
  "paste",
  "pastilles",
  "strip",
  "patch",
  "dispersible_film",
  "powder",
  "solution",
  "sachet",
  "syrup",
  "spiral",
  "spray",
  "suppositories",
  "suspension",
  "tablets",
  "vaginal_tablets",
  "vial",
  "shampoo",
  "effervescent_tablets",
  "syringe",
  "emulsion",
];

export function AdminPage() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <h1 className="font-heading mb-6 text-2xl font-semibold">
        {t("auth.admin.title")}
      </h1>
      <Tabs defaultValue="analytics">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:overflow-visible md:px-0 md:pb-0">
          <TabsList className="group-data-horizontal/tabs:h-11 md:group-data-horizontal/tabs:h-9">
            <TabsTrigger
              className="flex-none"
              value="analytics"
              aria-label={t("admin.entities.analytics")}
              title={t("admin.entities.analytics")}
            >
              <BarChart3Icon />
              {t("admin.entities.analytics")}
            </TabsTrigger>
            <TabsTrigger
              className="flex-none"
              value="medicines"
              aria-label={t("admin.entities.medicines")}
              title={t("admin.entities.medicines")}
            >
              <PillIcon />
              {t("admin.entities.medicines")}
            </TabsTrigger>
            <TabsTrigger
              className="flex-none"
              value="categories"
              aria-label={t("admin.entities.categories")}
              title={t("admin.entities.categories")}
            >
              <FolderTreeIcon />
              {t("admin.entities.categories")}
            </TabsTrigger>
            <TabsTrigger
              className="flex-none"
              value="suppliers"
              aria-label={t("admin.entities.suppliers")}
              title={t("admin.entities.suppliers")}
            >
              <TruckIcon />
              {t("admin.entities.suppliers")}
            </TabsTrigger>
            <TabsTrigger
              className="flex-none"
              value="wastage"
              aria-label={t("admin.entities.wastage")}
              title={t("admin.entities.wastage")}
            >
              <Trash2Icon />
              {t("admin.entities.wastage")}
            </TabsTrigger>
            <TabsTrigger
              className="flex-none"
              value="receiving"
              aria-label={t("admin.entities.receiving")}
              title={t("admin.entities.receiving")}
            >
              <ClipboardListIcon />
              {t("admin.entities.receiving")}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="analytics" className="mt-4 min-w-0">
          <AnalyticsPanel />
        </TabsContent>
        <TabsContent value="medicines" className="mt-4">
          <MedicinesTab />
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="suppliers" className="mt-4">
          <SuppliersTab />
        </TabsContent>
        <TabsContent value="wastage" className="mt-4 min-w-0">
          <WastagePanel />
        </TabsContent>
        <TabsContent value="receiving" className="mt-4 min-w-0">
          <ReceivingActivityPanel />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

const str = (v: string | null | undefined) => v ?? "";
const orNull = (v: string) => v.trim() || null;

function SuppliersTab() {
  const { t } = useTranslation();
  const suppliers = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: adminEndpoints.suppliers.list,
  });
  const fields: FieldDef[] = [
    { name: "name", type: "text", required: true },
    { name: "contact_phone", type: "text" },
    { name: "address", type: "text" },
  ];
  // Flat, low-cardinality data (name/phone/address) with no hierarchy - a
  // table already suits it; only sorting on name is worth adding here.
  return (
    <CrudPanel<Supplier>
      entity="suppliers"
      items={suppliers.data}
      idOf={(s) => s.supplier_id}
      columns={[
        {
          header: t("admin.fields.name"),
          cell: (s) => s.name,
          sortValue: (s) => s.name.toLowerCase(),
        },
        {
          header: t("admin.fields.contact_phone"),
          cell: (s) => str(s.contact_phone),
        },
        { header: t("admin.fields.address"), cell: (s) => str(s.address) },
      ]}
      fields={fields}
      toValues={(s) => ({
        name: s.name,
        contact_phone: str(s.contact_phone),
        address: str(s.address),
      })}
      save={(id, v) => {
        const body: SupplierInput = {
          name: v.name.trim(),
          contact_phone: orNull(v.contact_phone),
          address: orNull(v.address),
        };
        return id === null
          ? adminEndpoints.suppliers.create(body)
          : adminEndpoints.suppliers.update(id, body);
      }}
      remove={adminEndpoints.suppliers.remove}
      queryKey={["admin-suppliers"]}
    />
  );
}

/** Recursive, editable rendering of the category tree (admin only - the
 * customer-facing CategoryTreeNav is a read-only nav, not an edit surface).
 * Top-level categories start expanded (the admin scans those first);
 * deeper levels start collapsed to keep a large tree scannable. */
function CategoryTree({
  nodes,
  renderActions,
  onAddChild,
}: {
  nodes: CategoryNode[];
  renderActions: (node: Category) => ReactNode;
  onAddChild: (parentId: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  // nodes is [] on first render while the query loads, so the lazy
  // useState initializer above can't see the real top-level ids. Seed them
  // in once, the first time nodes becomes non-empty - guarded so it never
  // re-fires (and stomps a user's manual collapse) on later refetches.
  const seeded = useRef(false);
  if (!seeded.current && nodes.length > 0) {
    seeded.current = true;
    setExpanded(new Set(nodes.map((n) => n.category_id)));
  }

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function branch(level: CategoryNode[], depth: number) {
    if (level.length === 0) return null;
    return (
      <ul
        className={
          depth > 0
            ? "ml-5 flex flex-col gap-1.5 border-l pl-3"
            : "flex flex-col gap-1.5"
        }
      >
        {level.map((node) => {
          const hasChildren = node.children.length > 0;
          const open = expanded.has(node.category_id);
          return (
            <li key={node.category_id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 rounded-xl border p-2.5">
                <div className="flex min-w-0 items-center gap-1">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggle(node.category_id)}
                      aria-expanded={open}
                      aria-label={t(
                        open ? "catalog.collapse" : "catalog.expand",
                      )}
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <ChevronRightIcon
                        className={cn(
                          "size-4 transition-transform",
                          open && "rotate-90",
                        )}
                      />
                    </button>
                  ) : (
                    <span className="size-7 shrink-0" />
                  )}
                  <span className="min-w-0 truncate text-sm font-medium">
                    {categoryLabel(node, i18n.language)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("admin.addChild")}
                    title={t("admin.addChild")}
                    onClick={() => onAddChild(node.category_id)}
                  >
                    <PlusIcon />
                  </Button>
                  {renderActions(node)}
                </div>
              </div>
              {open && hasChildren ? branch(node.children, depth + 1) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  return branch(nodes, 0);
}

function CategoriesTab() {
  const { t } = useTranslation();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: catalogEndpoints.categories,
  });
  const all = categories.data ?? [];
  const fields: FieldDef[] = [
    { name: "name", type: "text", required: true },
    {
      name: "parent_id",
      type: "select",
      options: all.map((c) => ({
        value: String(c.category_id),
        label: c.name,
      })),
    },
  ];
  const columns: CrudColumn<Category>[] = [
    { header: t("admin.fields.name"), cell: (c) => c.name },
  ];
  return (
    <CrudPanel<Category>
      entity="categories"
      items={all}
      idOf={(c) => c.category_id}
      columns={columns}
      fields={fields}
      toValues={(c) => ({
        name: c.name,
        parent_id: c.parent_id === null ? "" : String(c.parent_id),
      })}
      save={(id, v) => {
        const body: CategoryInput = {
          name: v.name.trim(),
          parent_id: v.parent_id ? Number(v.parent_id) : null,
        };
        return id === null
          ? adminEndpoints.categories.create(body)
          : adminEndpoints.categories.update(id, body);
      }}
      remove={adminEndpoints.categories.remove}
      queryKey={["categories"]}
      body={({ items, actions, openNew }) => (
        <CategoryTree
          nodes={buildCategoryTree(items)}
          renderActions={actions}
          onAddChild={(parentId) => openNew({ parent_id: String(parentId) })}
        />
      )}
    />
  );
}

type StockFilter = "all" | "low" | "out";
type RxFilter = "all" | "true" | "false";

function MedicinesTab() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [rxFilter, setRxFilter] = useState<RxFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  const medicines = useQuery({
    queryKey: ["admin-medicines", query, page, categoryFilter, rxFilter],
    queryFn: () =>
      catalogEndpoints.medicines({
        q: query || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
        requires_prescription:
          rxFilter === "all" ? undefined : rxFilter === "true",
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: catalogEndpoints.categories,
  });
  const suppliers = useQuery({
    queryKey: ["admin-suppliers"],
    queryFn: adminEndpoints.suppliers.list,
  });

  // Only leaf categories can hold medicines (the server rejects the others).
  const parents = new Set((categories.data ?? []).map((c) => c.parent_id));
  const leaves = (categories.data ?? []).filter(
    (c) => !parents.has(c.category_id),
  );
  const categoryName = (id: number) =>
    categories.data?.find((c) => c.category_id === id)?.name ?? "—";
  const supplierName = (id: number) =>
    suppliers.data?.find((s) => s.supplier_id === id)?.name ?? "—";

  const total = medicines.data?.total ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  // shortcut: stock filter runs client-side on the current page only (the
  // server has no low/out-of-stock query param); fine at this page size,
  // revisit if the catalog grows past a page per filter.
  const items =
    stockFilter === "all"
      ? medicines.data?.items
      : medicines.data?.items.filter((m) =>
          stockFilter === "out"
            ? m.stock_quantity === 0
            : m.stock_quantity > 0 && m.stock_quantity <= m.reorder_threshold,
        );

  const fields: FieldDef[] = [
    { name: "name", type: "text", required: true },
    { name: "manufacturer", type: "text" },
    {
      name: "dosage_form",
      type: "select",
      options: DOSAGE_FORMS.map((form) => ({
        value: form,
        label: t(`dosageForms.${form}`),
      })),
    },
    { name: "price", type: "decimal", required: true },
    { name: "requires_prescription", type: "bool" },
    { name: "reorder_threshold", type: "number" },
    {
      name: "category_id",
      type: "select",
      required: true,
      options: leaves.map((c) => ({
        value: String(c.category_id),
        label: c.name,
      })),
    },
    {
      name: "supplier_id",
      type: "select",
      required: true,
      options: (suppliers.data ?? []).map((s) => ({
        value: String(s.supplier_id),
        label: s.name,
      })),
    },
  ];

  return (
    <CrudPanel<Medicine>
      entity="medicines"
      items={items}
      idOf={(m) => m.medicine_id}
      columns={[
        {
          header: t("admin.fields.name"),
          // Truncated with a tooltip rather than wrapped: every other column
          // in this row is single-line, so wrapping only the name would make
          // rows with long names taller than the rest - truncation keeps a
          // uniform row height across the table.
          cell: (m) => (
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white">
                {m.image_urls[0] ? (
                  <img
                    src={m.image_urls[0]}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="size-full object-contain"
                  />
                ) : (
                  <PackageIcon
                    aria-label={t("catalog.noImage")}
                    className="size-5 text-muted-foreground/40"
                  />
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* biome-ignore lint/a11y/noNoninteractiveTabindex: focusable on purpose, so the tooltip with the full name reaches keyboard users too */}
                  <span tabIndex={0} className="block max-w-40 truncate">
                    {m.name}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{m.name}</TooltipContent>
              </Tooltip>
            </div>
          ),
          sortValue: (m) => m.name.toLowerCase(),
        },
        {
          header: t("admin.fields.price"),
          cell: (m) => formatPrice(m.price, i18n.language),
          sortValue: (m) => Number(m.price),
        },
        {
          header: t("admin.fields.stock_quantity"),
          cell: (m) => m.stock_quantity,
          sortValue: (m) => m.stock_quantity,
        },
        {
          header: t("admin.fields.category"),
          cell: (m) => categoryName(m.category_id),
        },
        {
          header: t("admin.fields.supplier"),
          cell: (m) => supplierName(m.supplier_id),
        },
        {
          header: t("medicine.prescription"),
          cell: (m) =>
            m.requires_prescription ? (
              <Badge variant="outline" className="gap-1">
                <ClipboardCheckIcon className="size-3" />
                {t("catalog.requiresPrescription")}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <MinusCircleIcon className="size-3" />
                {t("medicine.noPrescription")}
              </Badge>
            ),
        },
      ]}
      detailLabel={(m) => t("admin.viewDetailsFor", { name: m.name })}
      detail={(m) => (
        <>
          <SheetHeader>
            <SheetTitle>{m.name}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-6">
            <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border bg-white sm:aspect-[4/3]">
              {m.image_urls[0] ? (
                <img
                  src={m.image_urls[0]}
                  alt={m.name}
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

            <div className="flex flex-wrap gap-2">
              <Badge variant={m.stock_quantity > 0 ? "secondary" : "outline"}>
                {m.stock_quantity > 0
                  ? t("catalog.inStock")
                  : t("catalog.outOfStock")}
              </Badge>
              {m.requires_prescription ? (
                <Badge variant="outline" className="gap-1">
                  <ClipboardCheckIcon className="size-3" />
                  {t("catalog.requiresPrescription")}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <MinusCircleIcon className="size-3" />
                  {t("medicine.noPrescription")}
                </Badge>
              )}
            </div>

            <p className="text-2xl font-semibold tabular-nums">
              {formatPrice(m.price, i18n.language)}
            </p>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t pt-4 text-sm">
              <dt className="text-muted-foreground">
                {t("admin.fields.manufacturer")}
              </dt>
              <dd>{m.manufacturer ?? "—"}</dd>
              <dt className="text-muted-foreground">
                {t("admin.fields.dosage_form")}
              </dt>
              <dd>{dosageFormLabel(m.dosage_form, t)}</dd>
              <dt className="text-muted-foreground">
                {t("admin.fields.stock_quantity")}
              </dt>
              <dd>{m.stock_quantity}</dd>
              <dt className="text-muted-foreground">
                {t("admin.fields.reorder_threshold")}
              </dt>
              <dd>{m.reorder_threshold}</dd>
              <dt className="text-muted-foreground">
                {t("admin.fields.category")}
              </dt>
              <dd>{categoryName(m.category_id)}</dd>
              <dt className="text-muted-foreground">
                {t("admin.fields.supplier")}
              </dt>
              <dd>{supplierName(m.supplier_id)}</dd>
            </dl>
          </div>
        </>
      )}
      fields={fields}
      toValues={(m): Values => ({
        name: m.name,
        manufacturer: str(m.manufacturer),
        dosage_form: str(m.dosage_form),
        price: m.price,
        requires_prescription: String(m.requires_prescription),
        reorder_threshold: String(m.reorder_threshold),
        category_id: String(m.category_id),
        supplier_id: String(m.supplier_id),
      })}
      save={(id, v) => {
        const body: MedicineInput = {
          name: v.name.trim(),
          manufacturer: orNull(v.manufacturer),
          dosage_form: DOSAGE_FORMS.includes(v.dosage_form as DosageForm)
            ? (v.dosage_form as DosageForm)
            : null,
          price: v.price,
          requires_prescription: v.requires_prescription === "true",
          reorder_threshold: Number(v.reorder_threshold || 0),
          category_id: Number(v.category_id),
          supplier_id: Number(v.supplier_id),
        };
        return id === null
          ? adminEndpoints.medicines.create(body)
          : adminEndpoints.medicines.update(id, body);
      }}
      remove={adminEndpoints.medicines.remove}
      queryKey={["admin-medicines"]}
      toolbar={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(0);
              setQuery(search.trim());
            }}
            className="flex w-full gap-2 sm:w-auto"
          >
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("catalog.search")}
              aria-label={t("catalog.search")}
              className="w-full sm:w-64"
            />
            <Button
              type="submit"
              variant="outline"
              size="icon"
              aria-label={t("catalog.searchSubmit")}
            >
              <SearchIcon />
            </Button>
          </form>
          <NativeSelect
            aria-label={t("admin.fields.category")}
            value={categoryFilter}
            onChange={(e) => {
              setPage(0);
              setCategoryFilter(e.target.value);
            }}
          >
            <NativeSelectOption value="">
              {t("catalog.allCategories")}
            </NativeSelectOption>
            {leaves.map((c) => (
              <NativeSelectOption
                key={c.category_id}
                value={String(c.category_id)}
              >
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label={t("medicine.prescription")}
            value={rxFilter}
            onChange={(e) => {
              setPage(0);
              setRxFilter(e.target.value as RxFilter);
            }}
          >
            <NativeSelectOption value="all">
              {t("staff.prescriptions.all")}
            </NativeSelectOption>
            <NativeSelectOption value="true">
              {t("catalog.requiresPrescription")}
            </NativeSelectOption>
            <NativeSelectOption value="false">
              {t("catalog.otcOnly")}
            </NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            aria-label={t("admin.fields.stock_quantity")}
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
          >
            <NativeSelectOption value="all">
              {t("staff.prescriptions.all")}
            </NativeSelectOption>
            <NativeSelectOption value="low">
              {t("analytics.level.low")}
            </NativeSelectOption>
            <NativeSelectOption value="out">
              {t("analytics.level.out")}
            </NativeSelectOption>
          </NativeSelect>
        </div>
      }
      footer={
        total > PAGE_SIZE ? (
          <nav
            aria-label={t("catalog.pagination")}
            className="flex items-center justify-center gap-2"
          >
            <Button
              variant="ghost"
              size="icon"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              aria-label={t("catalog.prev")}
            >
              <ChevronLeftIcon />
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">
              {page + 1} / {lastPage + 1}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={page >= lastPage}
              onClick={() => setPage((p) => p + 1)}
              aria-label={t("catalog.next")}
            >
              <ChevronRightIcon />
            </Button>
          </nav>
        ) : null
      }
    />
  );
}
