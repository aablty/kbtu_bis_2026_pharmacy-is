import type { TFunction } from "i18next";
import { z } from "zod";
import { codeField, emailField, passwordField } from "@/shared/lib/validation";

export const forgotPasswordSchema = (t: TFunction) =>
  z.object({
    email: emailField(t),
  });

export const resetPasswordSchema = (t: TFunction) =>
  z.object({
    email: emailField(t),
    code: codeField(t),
    new_password: passwordField(t),
  });

export type ForgotPasswordValues = z.infer<
  ReturnType<typeof forgotPasswordSchema>
>;
export type ResetPasswordValues = z.infer<
  ReturnType<typeof resetPasswordSchema>
>;
