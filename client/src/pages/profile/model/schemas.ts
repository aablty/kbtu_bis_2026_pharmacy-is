import type { TFunction } from "i18next";
import { z } from "zod";

export const personalSchema = (t: TFunction) =>
  z.object({
    fullName: z
      .string()
      .trim()
      .max(120, { error: t("profile.validation.nameMax") }),
  });

export type PersonalValues = z.infer<ReturnType<typeof personalSchema>>;

export const passwordSchema = (t: TFunction) =>
  z
    .object({
      current: z.string().min(1, { error: t("auth.validation.required") }),
      next: z
        .string()
        .min(8, { error: t("auth.validation.passwordMin") })
        .max(128, { error: t("profile.validation.passwordMax") }),
      confirm: z.string(),
    })
    .refine((v) => v.next === v.confirm, {
      path: ["confirm"],
      error: t("profile.validation.mismatch"),
    });

export type PasswordValues = z.infer<ReturnType<typeof passwordSchema>>;
