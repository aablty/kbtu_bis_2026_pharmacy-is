import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  BarChart3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderTreeIcon,
  PillIcon,
  SearchIcon,
  TruckIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatPrice } from "@/features/browse-catalog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AppShell } from "@/widgets/layout";
import { AnalyticsPanel } from "./analytics-panel";
import { CrudPanel, type FieldDef, type Values } from "./crud-panel";

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
  return (
    <CrudPanel<Supplier>
      entity="suppliers"
      items={suppliers.data}
      idOf={(s) => s.supplier_id}
      columns={[
        { header: t("admin.fields.name"), cell: (s) => s.name },
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

function CategoriesTab() {
  const { t } = useTranslation();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: catalogEndpoints.categories,
  });
  const all = categories.data ?? [];
  const nameOf = (id: number | null) =>
    all.find((c) => c.category_id === id)?.name ?? "—";
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
  return (
    <CrudPanel<Category>
      entity="categories"
      items={all}
      idOf={(c) => c.category_id}
      columns={[
        { header: t("admin.fields.name"), cell: (c) => c.name },
        { header: t("admin.fields.parent"), cell: (c) => nameOf(c.parent_id) },
      ]}
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
    />
  );
}

function MedicinesTab() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const medicines = useQuery({
    queryKey: ["admin-medicines", query, page],
    queryFn: () =>
      catalogEndpoints.medicines({
        q: query || undefined,
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
    { name: "expiry_date", type: "date" },
    { name: "price", type: "decimal", required: true },
    { name: "requires_prescription", type: "bool" },
    { name: "stock_quantity", type: "number", required: true },
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
      items={medicines.data?.items}
      idOf={(m) => m.medicine_id}
      columns={[
        { header: t("admin.fields.name"), cell: (m) => m.name },
        {
          header: t("admin.fields.price"),
          cell: (m) => formatPrice(m.price, i18n.language),
        },
        {
          header: t("admin.fields.stock_quantity"),
          cell: (m) => m.stock_quantity,
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
          header: t("admin.fields.rx"),
          cell: (m) =>
            m.requires_prescription ? (
              <Badge variant="outline">Rx</Badge>
            ) : null,
        },
      ]}
      fields={fields}
      toValues={(m): Values => ({
        name: m.name,
        manufacturer: str(m.manufacturer),
        dosage_form: str(m.dosage_form),
        expiry_date: m.expiry_date ?? "",
        price: m.price,
        requires_prescription: String(m.requires_prescription),
        stock_quantity: String(m.stock_quantity),
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
          expiry_date: v.expiry_date || null,
          price: v.price,
          requires_prescription: v.requires_prescription === "true",
          stock_quantity: Number(v.stock_quantity),
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
