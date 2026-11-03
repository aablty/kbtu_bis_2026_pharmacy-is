import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { authEndpoints } from "@/shared/api/auth-endpoints";
import { authErrorKey } from "@/shared/api/errors";
import { Button } from "@/shared/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/shared/ui/input-otp";
import {
  type ResetPasswordValues,
  resetPasswordSchema,
} from "../model/password-reset-schema";

export function ResetPasswordForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => resetPasswordSchema(t), [t]);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: params.get("email") ?? "",
      code: "",
      new_password: "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ResetPasswordValues) {
    setServerError(null);
    try {
      await authEndpoints.resetPassword(values);
      navigate("/sign-in", { replace: true });
    } catch (error) {
      setServerError(t(authErrorKey(error)));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="reset-email">{t("auth.email")}</FieldLabel>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.code}>
          <FieldLabel>{t("auth.code")}</FieldLabel>
          <Controller
            control={form.control}
            name="code"
            render={({ field }) => (
              <InputOTP
                maxLength={6}
                value={field.value}
                onChange={field.onChange}
                aria-invalid={!!errors.code}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            )}
          />
          <FieldError errors={[errors.code]} />
        </Field>
        <Field data-invalid={!!errors.new_password}>
          <FieldLabel htmlFor="reset-password">
            {t("auth.newPassword")}
          </FieldLabel>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.new_password}
            {...form.register("new_password")}
          />
          <FieldError errors={[errors.new_password]} />
        </Field>
        {serverError ? (
          <p role="alert" className="text-destructive text-sm">
            {serverError}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {t("auth.reset.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
