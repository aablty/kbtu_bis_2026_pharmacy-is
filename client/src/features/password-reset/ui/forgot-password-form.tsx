import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { authEndpoints, authErrorKey } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { FormErrorAlert } from "@/shared/ui/form-error-alert";
import { Input } from "@/shared/ui/input";
import { Spinner } from "@/shared/ui/spinner";
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
        {serverError ? <FormErrorAlert>{serverError}</FormErrorAlert> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {t("auth.forgot.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
