import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { authEndpoints, authErrorKey } from "@/shared/api";
import { toApiLocale } from "@/shared/lib/locale";
import { Button } from "@/shared/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { FormErrorAlert } from "@/shared/ui/form-error-alert";
import { Input } from "@/shared/ui/input";
import { PasswordInput } from "@/shared/ui/password-input";
import { Spinner } from "@/shared/ui/spinner";
import { type SignUpValues, signUpSchema } from "../model/sign-up-schema";

export function SignUpForm() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => signUpSchema(t), [t]);
  const form = useForm<SignUpValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: SignUpValues) {
    setServerError(null);
    try {
      await authEndpoints.register({
        email: values.email,
        password: values.password,
        full_name: values.fullName,
        preferred_locale: toApiLocale(i18n.language),
      });
      navigate(`/verify-email?email=${encodeURIComponent(values.email)}`, {
        replace: true,
      });
    } catch (error) {
      setServerError(t(authErrorKey(error)));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor="sign-up-full-name">
            {t("auth.fullName")}
          </FieldLabel>
          <Input
            id="sign-up-full-name"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            aria-describedby={
              errors.fullName ? "sign-up-full-name-error" : undefined
            }
            {...form.register("fullName")}
          />
          <FieldError id="sign-up-full-name-error" errors={[errors.fullName]} />
        </Field>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="sign-up-email">{t("auth.email")}</FieldLabel>
          <Input
            id="sign-up-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "sign-up-email-error" : undefined}
            {...form.register("email")}
          />
          <FieldError id="sign-up-email-error" errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="sign-up-password">
            {t("auth.password")}
          </FieldLabel>
          <PasswordInput
            id="sign-up-password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={
              errors.password ? "sign-up-password-error" : undefined
            }
            toggleLabel={t("auth.togglePassword")}
            {...form.register("password")}
          />
          <FieldError id="sign-up-password-error" errors={[errors.password]} />
        </Field>
        {serverError ? <FormErrorAlert>{serverError}</FormErrorAlert> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {t("auth.signUp.submit")}
        </Button>
        <div className="text-sm text-center text-muted-foreground">
          <Link className="underline" to="/sign-in">
            {t("auth.links.signIn")}
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}
