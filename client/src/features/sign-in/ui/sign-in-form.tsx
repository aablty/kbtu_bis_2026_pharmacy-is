import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { type AuthErrorKey, authEndpoints, authErrorKey } from "@/shared/api";
import { establishSession } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { FormErrorAlert } from "@/shared/ui/form-error-alert";
import { Input } from "@/shared/ui/input";
import { PasswordInput } from "@/shared/ui/password-input";
import { Spinner } from "@/shared/ui/spinner";
import { type SignInValues, signInSchema } from "../model/sign-in-schema";

export function SignInForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<AuthErrorKey | null>(null);
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
      setServerError(authErrorKey(error));
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
            aria-describedby={errors.email ? "sign-in-email-error" : undefined}
            {...form.register("email")}
          />
          <FieldError id="sign-in-email-error" errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="sign-in-password">
              {t("auth.password")}
            </FieldLabel>
            <Link
              className="text-sm text-muted-foreground underline"
              to="/forgot-password"
            >
              {t("auth.links.forgot")}
            </Link>
          </div>
          <PasswordInput
            id="sign-in-password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={
              errors.password ? "sign-in-password-error" : undefined
            }
            toggleLabel={t("auth.togglePassword")}
            {...form.register("password")}
          />
          <FieldError id="sign-in-password-error" errors={[errors.password]} />
        </Field>
        {serverError ? (
          <FormErrorAlert>
            {t(serverError)}
            {serverError === "auth.errors.emailNotVerified" ? (
              <>
                {" "}
                <Link
                  to={`/verify-email?email=${encodeURIComponent(form.getValues("email"))}`}
                >
                  {t("auth.verify.title")}
                </Link>
              </>
            ) : null}
          </FormErrorAlert>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {t("auth.signIn.submit")}
        </Button>
        <div className="text-sm text-center text-muted-foreground">
          <Link className="underline" to="/sign-up">
            {t("auth.links.signUp")}
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}
