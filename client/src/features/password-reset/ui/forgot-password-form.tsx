import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { authEndpoints } from "@/shared/api/auth-endpoints";
import { authErrorKey } from "@/shared/api/errors";
import { Button } from "@/shared/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import {
  type ForgotPasswordValues,
  forgotPasswordSchema,
} from "../model/password-reset-schema";

export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => forgotPasswordSchema(t), [t]);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ForgotPasswordValues) {
    setServerError(null);
    try {
      await authEndpoints.forgotPassword(values);
      navigate(`/reset-password?email=${encodeURIComponent(values.email)}`, {
        replace: true,
      });
    } catch (error) {
      setServerError(t(authErrorKey(error)));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="forgot-email">{t("auth.email")}</FieldLabel>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        {serverError ? (
          <p role="alert" className="text-destructive text-sm">
            {serverError}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {t("auth.forgot.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
