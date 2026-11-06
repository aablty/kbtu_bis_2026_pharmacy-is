import type { TFunction } from "i18next";
import { z } from "zod";

export const emailField = (t: TFunction) =>
  z
    .string()
    .trim()
    .pipe(z.email({ error: t("auth.validation.email") }));

export const passwordField = (t: TFunction) =>
  z.string().min(8, { error: t("auth.validation.passwordMin") });

export const requiredField = (t: TFunction) =>
  z.string().min(1, { error: t("auth.validation.required") });

export const fullNameField = (t: TFunction) =>
  z
    .string()
    .trim()
    .pipe(
      z
        .string()
        .min(1, { error: t("auth.validation.required") })
        .max(120, { error: t("auth.validation.fullNameMax") }),
    );

export const codeField = (t: TFunction) =>
  z.string().length(6, { error: t("auth.validation.code") });
