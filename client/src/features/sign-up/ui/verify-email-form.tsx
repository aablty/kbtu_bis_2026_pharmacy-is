import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { authEndpoints, authErrorKey } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { FormErrorAlert } from "@/shared/ui/form-error-alert";
import { Input } from "@/shared/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/shared/ui/input-otp";
import { Spinner } from "@/shared/ui/spinner";
import {
  type VerifyEmailValues,
  verifyEmailSchema,
} from "../model/sign-up-schema";

export function VerifyEmailForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => verifyEmailSchema(t), [t]);
  const form = useForm<VerifyEmailValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: params.get("email") ?? "", code: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: VerifyEmailValues) {
    setServerError(null);
    try {
      await authEndpoints.verifyEmail(values);
      navigate("/sign-in", { replace: true });
    } catch (error) {
      setServerError(t(authErrorKey(error)));
    }
  }

  async function onResend() {
    const email = form.getValues("email");
    setServerError(null);
    try {
      await authEndpoints.resendVerification({ email });
      toast.success(t("auth.verify.resent"));
    } catch (error) {
      setServerError(t(authErrorKey(error)));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="verify-email">{t("auth.email")}</FieldLabel>
          <Input
            id="verify-email"
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
        {serverError ? <FormErrorAlert>{serverError}</FormErrorAlert> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : null}
          {t("auth.verify.submit")}
        </Button>
        <Button type="button" variant="ghost" onClick={onResend}>
          {t("auth.verify.resend")}
        </Button>
      </FieldGroup>
    </form>
  );
}
