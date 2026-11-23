import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  createSortedRowModel,
  type Header,
  type RowData,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { isAxiosError } from "axios";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  InboxIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ListEmpty } from "@/shared/ui/list-empty";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { SkeletonList } from "@/shared/ui/skeleton-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

export type Values = Record<string, string>;

export interface FieldDef {
  name: string;
  type: "text" | "number" | "decimal" | "bool" | "select" | "date";
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface CrudColumn<T extends RowData> {
  header: string;
  cell: (item: T) => ReactNode;
  /** Enables column sorting (TanStack Table) by extracting a comparable value. */
  sortValue?: (item: T) => string | number;
}

/** Context passed to a custom `body` renderer, replacing the default table/cards. */
export interface CrudBodyContext<T extends RowData> {
  items: T[];
  actions: (item: T) => ReactNode;
  openNew: (overrides?: Values) => void;
  openEdit: (item: T) => void;
  requestDelete: (item: T) => void;
}

export interface CrudPanelProps<T extends RowData> {
  entity: string; // i18n prefix under "admin.entities"
  items: T[] | undefined;
  idOf: (item: T) => number;
  columns: CrudColumn<T>[];
  fields: FieldDef[];
  toValues: (item: T) => Values;
  save: (id: number | null, values: Values) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
  queryKey: unknown[];
  toolbar?: ReactNode;
  footer?: ReactNode;
  /** Replaces the default table (desktop)/card (mobile) list, e.g. for a tree view. */
  body?: (ctx: CrudBodyContext<T>) => ReactNode;
}

const EMPTY_VALUES = (fields: FieldDef[]): Values =>
  Object.fromEntries(
    fields.map((f) => [f.name, f.type === "bool" ? "false" : ""]),
  );

// One headless sort implementation shared by every admin/staff CRUD table (see
// .agents/frontend/CLAUDE.md's "Data layer" section).
const sortingFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {},
});
const EMPTY_ITEMS: readonly never[] = [];

function sortIndicator(sorted: false | "asc" | "desc") {
  if (sorted === "asc") return ArrowUpIcon;
  if (sorted === "desc") return ArrowDownIcon;
  return ArrowUpDownIcon;
}

function headerLabel(header: unknown): string {
  return typeof header === "string" ? header : "";
}

/** A column header that's also a sort toggle, when the column is sortable. */
function SortableHeader<T extends RowData>({
  header,
}: {
  header: Header<typeof sortingFeatures, T>;
}) {
  const label = headerLabel(header.column.columnDef.header);
  if (!header.column.getCanSort()) return label;
  const Icon = sortIndicator(header.column.getIsSorted());
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3 h-7 gap-1 px-2 font-medium"
      onClick={header.column.getToggleSortingHandler()}
    >
      {label}
      <Icon
        className={
          header.column.getIsSorted()
            ? "size-3.5"
            : "size-3.5 text-muted-foreground"
        }
      />
    </Button>
  );
}

export function CrudPanel<T extends RowData>({
  entity,
  items,
  idOf,
  columns,
  fields,
  toValues,
  save,
  remove,
  queryKey,
  toolbar,
  footer,
  body,
}: CrudPanelProps<T>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{
    id: number | null;
    values: Values;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);

  const columnHelper = useMemo(
    () => createColumnHelper<typeof sortingFeatures, T>(),
    [],
  );
  const tableColumns = useMemo(
    () =>
      columns.map((c, i) =>
        columnHelper.display({
          id: `col-${i}`,
          header: c.header,
          enableSorting: !!c.sortValue,
          sortFn: c.sortValue
            ? (rowA, rowB) => {
                const a = c.sortValue?.(rowA.original);
                const b = c.sortValue?.(rowB.original);
                if (a === undefined || b === undefined) return 0;
                return a < b ? -1 : a > b ? 1 : 0;
              }
            : undefined,
        }),
      ),
    [columns, columnHelper],
  );
  const table = useTable({
    features: sortingFeatures,
    columns: tableColumns,
    data: (items ?? EMPTY_ITEMS) as T[],
  });
  const rows = table.getRowModel().rows;

  const saveMutation = useMutation({
    mutationFn: (vars: { id: number | null; values: Values }) =>
      save(vars.id, vars.values),
    onSuccess: () => {
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => setFormError(errorText(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => remove(id),
    onSuccess: () => {
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => toast.error(errorText(error)),
  });

  function open(item: T | null, overrides?: Values) {
    setFormError(null);
    setEditing(
      item
        ? { id: idOf(item), values: toValues(item) }
        : { id: null, values: { ...EMPTY_VALUES(fields), ...overrides } },
    );
  }

  function errorText(error: unknown): string {
    if (isAxiosError(error) && error.response?.status === 409)
      return t("admin.errors.inUse");
    return t("admin.errors.generic");
  }

  function setField(name: string, value: string) {
    setEditing((prev) =>
      prev ? { ...prev, values: { ...prev.values, [name]: value } } : prev,
    );
  }

  const missingRequired = editing
    ? fields.some(
        (f) =>
          f.required && f.type !== "bool" && !editing.values[f.name]?.trim(),
      )
    : false;

  // Edit and delete, shared by the table row (desktop) and the card (phone).
  function actions(item: T) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("admin.edit")}
          title={t("admin.edit")}
          onClick={() => open(item)}
        >
          <PencilIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("admin.delete")}
          title={t("admin.delete")}
          disabled={removeMutation.isPending}
          onClick={() => setDeleting(item)}
        >
          <Trash2Icon />
        </Button>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {toolbar}
        <Button onClick={() => open(null)} className="w-full sm:w-auto">
          <PlusIcon />
          {t("admin.add")}
        </Button>
      </div>

      {items === undefined ? (
        <SkeletonList rows={4} label={t("catalog.loading")} />
      ) : null}
      {items && items.length === 0 ? (
        <ListEmpty
          icon={InboxIcon}
          title={t("list.admin.title")}
          description={t("list.admin.hint")}
        >
          <Button onClick={() => open(null)}>
            <PlusIcon />
            {t("admin.add")}
          </Button>
        </ListEmpty>
      ) : null}
      {items && items.length > 0 ? (
        body ? (
          body({
            items,
            actions,
            openNew: (overrides) => open(null, overrides),
            openEdit: open,
            requestDelete: setDeleting,
          })
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    {table.getHeaderGroups()[0]?.headers.map((header) => (
                      <TableHead key={header.id}>
                        <SortableHeader header={header} />
                      </TableHead>
                    ))}
                    <TableHead className="text-right">
                      {t("staff.orders.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const item = row.original;
                    return (
                      <TableRow key={idOf(item)}>
                        {columns.map((c) => (
                          <TableCell key={c.header}>{c.cell(item)}</TableCell>
                        ))}
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {actions(item)}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <ul className="flex flex-col gap-3 md:hidden">
              {rows.map((row) => {
                const item = row.original;
                return (
                  <li
                    key={idOf(item)}
                    className="flex flex-col gap-3 rounded-2xl border p-4"
                  >
                    <p className="text-sm font-medium break-words">
                      {columns[0]?.cell(item)}
                    </p>
                    <dl className="flex flex-col gap-1.5 text-sm">
                      {columns.slice(1).map((c) => (
                        <div
                          key={c.header}
                          className="flex justify-between gap-3"
                        >
                          <dt className="text-muted-foreground">{c.header}</dt>
                          <dd className="min-w-0 text-right break-words">
                            {c.cell(item)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="flex justify-end gap-1 border-t pt-3">
                      {actions(item)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )
      ) : null}
      {footer}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.id === null ? t("admin.add") : t("admin.edit")}
              {" · "}
              {t(`admin.entities.${entity}`)}
            </DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (editing && !missingRequired) saveMutation.mutate(editing);
            }}
          >
            {fields.map((f) => {
              const id = `${entity}-${f.name}`;
              const value = editing?.values[f.name] ?? "";
              return (
                <div key={f.name} className="flex flex-col gap-1">
                  <Label htmlFor={id}>
                    {t(`admin.fields.${f.name}`)}
                    {f.required ? " *" : ""}
                  </Label>
                  {f.type === "select" || f.type === "bool" ? (
                    <NativeSelect
                      id={id}
                      value={value}
                      onChange={(e) => setField(f.name, e.target.value)}
                    >
                      {f.type === "bool" ? (
                        <>
                          <NativeSelectOption value="false">
                            {t("admin.no")}
                          </NativeSelectOption>
                          <NativeSelectOption value="true">
                            {t("admin.yes")}
                          </NativeSelectOption>
                        </>
                      ) : (
                        <>
                          <NativeSelectOption value="">
                            {t("admin.none")}
                          </NativeSelectOption>
                          {f.options?.map((o) => (
                            <NativeSelectOption key={o.value} value={o.value}>
                              {o.label}
                            </NativeSelectOption>
                          ))}
                        </>
                      )}
                    </NativeSelect>
                  ) : (
                    <Input
                      id={id}
                      type={
                        f.type === "date"
                          ? "date"
                          : f.type === "text"
                            ? "text"
                            : "number"
                      }
                      step={f.type === "decimal" ? "0.01" : undefined}
                      min={
                        f.type === "number" || f.type === "decimal"
                          ? 0
                          : undefined
                      }
                      value={value}
                      onChange={(e) => setField(f.name, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="submit"
                disabled={missingRequired || saveMutation.isPending}
              >
                {saveMutation.isPending ? t("admin.saving") : t("admin.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.confirmDelete", {
                name: deleting ? String(columns[0]?.cell(deleting) ?? "") : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => deleting && removeMutation.mutate(idOf(deleting))}
            >
              {removeMutation.isPending
                ? t("admin.deleting")
                : t("admin.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
