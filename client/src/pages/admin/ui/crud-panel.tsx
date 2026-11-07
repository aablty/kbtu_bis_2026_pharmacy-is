import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
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
  type: "text" | "number" | "decimal" | "bool" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface CrudPanelProps<T> {
  entity: string; // i18n prefix under "admin.entities"
  items: T[] | undefined;
  idOf: (item: T) => number;
  columns: { header: string; cell: (item: T) => ReactNode }[];
  fields: FieldDef[];
  toValues: (item: T) => Values;
  save: (id: number | null, values: Values) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
  queryKey: unknown[];
  toolbar?: ReactNode;
  footer?: ReactNode;
}

const EMPTY_VALUES = (fields: FieldDef[]): Values =>
  Object.fromEntries(
    fields.map((f) => [f.name, f.type === "bool" ? "false" : ""]),
  );

export function CrudPanel<T>({
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
}: CrudPanelProps<T>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{
    id: number | null;
    values: Values;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    onError: (error) => window.alert(errorText(error)),
  });

  function open(item: T | null) {
    setFormError(null);
    setEditing(
      item
        ? { id: idOf(item), values: toValues(item) }
        : { id: null, values: EMPTY_VALUES(fields) },
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {toolbar}
        <Button onClick={() => open(null)}>
          <PlusIcon />
          {t("admin.add")}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.header}>{c.header}</TableHead>
            ))}
            <TableHead className="text-right">
              {t("staff.orders.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items?.map((item) => (
            <TableRow key={idOf(item)}>
              {columns.map((c) => (
                <TableCell key={c.header}>{c.cell(item)}</TableCell>
              ))}
              <TableCell>
                <div className="flex justify-end gap-1">
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
                    onClick={() => {
                      if (window.confirm(t("admin.confirmDelete")))
                        removeMutation.mutate(idOf(item));
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
                      type={f.type === "text" ? "text" : "number"}
                      step={f.type === "decimal" ? "0.01" : undefined}
                      min={f.type === "text" ? undefined : 0}
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
                {t("admin.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
