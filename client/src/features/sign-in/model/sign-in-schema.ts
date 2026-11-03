import type { TFunction } from "i18next";
import { z } from "zod";
import { emailField, requiredField } from "@/shared/lib/validation";

export const signInSchema = (t: TFunction) =>
  z.object({
    email: emailField(t),
    password: requiredField(t),
  });

export type SignInValues = z.infer<ReturnType<typeof signInSchema>>;
