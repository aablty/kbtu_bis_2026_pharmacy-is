import type { TFunction } from "i18next";
import { z } from "zod";
import { codeField, emailField, passwordField } from "@/shared/lib/validation";

export const signUpSchema = (t: TFunction) =>
  z.object({
    email: emailField(t),
    password: passwordField(t),
  });

export const verifyEmailSchema = (t: TFunction) =>
  z.object({
    email: emailField(t),
    code: codeField(t),
  });

export type SignUpValues = z.infer<ReturnType<typeof signUpSchema>>;
export type VerifyEmailValues = z.infer<ReturnType<typeof verifyEmailSchema>>;
