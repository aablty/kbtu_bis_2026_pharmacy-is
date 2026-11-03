import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { authEndpoints } from "@/shared/api/auth-endpoints";
import { authErrorKey } from "@/shared/api/errors";
import { establishSession } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { type SignInValues, signInSchema } from "../model/sign-in-schema";

export function SignInForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => signInSchema(t), [t]);
  const form = useForm<SignInValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: SignInValues) {
    setServerError(null);
    try {
      const tokens = await authEndpoints.login(values);
      await establishSession(tokens);
      navigate("/profile", { replace: true });
    } catch (error) {
      setServerError(t(authErrorKey(error)));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="sign-in-email">{t("auth.email")}</FieldLabel>
          <Input
            id="sign-in-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="sign-in-password">
            {t("auth.password")}
          </FieldLabel>
          <Input
            id="sign-in-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
        {serverError ? (
          <p role="alert" className="text-destructive text-sm">
            {serverError}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {t("auth.signIn.submit")}
        </Button>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <Link className="underline" to="/forgot-password">
            {t("auth.links.forgot")}
          </Link>
          <Link className="underline" to="/sign-up">
            {t("auth.links.signUp")}
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}
