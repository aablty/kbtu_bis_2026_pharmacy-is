import type { TFunction } from "i18next";
import type { DosageForm } from "@/shared/api/catalog-types";

export function dosageFormLabel(
  dosageForm: DosageForm | null,
  t: TFunction,
): string {
  return dosageForm ? t(`dosageForms.${dosageForm}`) : "—";
}
