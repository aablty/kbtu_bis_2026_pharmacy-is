import { zodResolver } from "@hookform/resolvers/zod";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { authEndpoints, authErrorKey } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { FormErrorAlert } from "@/shared/ui/form-error-alert";
import { Input } from "@/shared/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/shared/ui/input-otp";
import { PasswordInput } from "@/shared/ui/password-input";
import { Spinner } from "@/shared/ui/spinner";
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
            readOnly
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "reset-email-error" : undefined}
            {...form.register("email")}
          />
          <FieldError id="reset-email-error" errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.code}>
          <FieldLabel>{t("auth.code")}</FieldLabel>
          <Controller
            control={form.control}
            name="code"
            render={({ field }) => (
              <InputOTP
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                value={field.value}
                onChange={field.onChange}
                aria-invalid={!!errors.code}
                aria-describedby={errors.code ? "reset-code-error" : undefined}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            )}
          />
          <FieldError id="reset-code-error" errors={[errors.code]} />
        </Field>
        <Field data-invalid={!!errors.new_password}>
          <FieldLabel htmlFor="reset-password">
            {t("auth.newPassword")}
          </FieldLabel>
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            aria-invalid={!!errors.new_password}
            aria-describedby={
              errors.new_password ? "reset-password-error" : undefined
            }
            toggleLabel={t("auth.togglePassword")}
            {...form.register("new_password")}
          />
          <FieldError
            id="reset-password-error"
            errors={[errors.new_password]}
          />
        </Field>
        {serverError ? <FormErrorAlert>{serverError}</FormErrorAlert> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {t("auth.reset.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
