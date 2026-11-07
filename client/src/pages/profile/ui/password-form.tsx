import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { userEndpoints } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/ui/field";
import { FormErrorAlert } from "@/shared/ui/form-error-alert";
import { PasswordInput } from "@/shared/ui/password-input";
import { passwordErrorKey } from "../model/password-error";
import { type PasswordValues, passwordSchema } from "../model/schemas";

export function PasswordForm() {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => passwordSchema(t), [t]);
  const form = useForm<PasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { current: "", next: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: PasswordValues) {
    setDone(false);
    setServerError(null);
    try {
      await userEndpoints.changePassword({
        current_password: values.current,
        new_password: values.next,
      });
      form.reset();
      setDone(true);
    } catch (error) {
      setServerError(t(passwordErrorKey(error)));
    }
  }

  const toggleLabel = t("auth.togglePassword");

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <FieldGroup>
        <Field data-invalid={!!errors.current}>
          <FieldLabel htmlFor="profile-current-password">
            {t("profile.currentPassword")}
          </FieldLabel>
          <PasswordInput
            toggleLabel={toggleLabel}
            id="profile-current-password"
            autoComplete="current-password"
            aria-invalid={!!errors.current}
            {...form.register("current")}
          />
          <FieldError errors={[errors.current]} />
        </Field>
        <Field data-invalid={!!errors.next}>
          <FieldLabel htmlFor="profile-new-password">
            {t("profile.newPassword")}
          </FieldLabel>
          <PasswordInput
            toggleLabel={toggleLabel}
            id="profile-new-password"
            autoComplete="new-password"
            aria-invalid={!!errors.next}
            aria-describedby="profile-new-password-hint"
            {...form.register("next")}
          />
          <FieldDescription id="profile-new-password-hint">
            {t("profile.passwordHint")}
          </FieldDescription>
          <FieldError errors={[errors.next]} />
        </Field>
        <Field data-invalid={!!errors.confirm}>
          <FieldLabel htmlFor="profile-confirm-password">
            {t("profile.confirmPassword")}
          </FieldLabel>
          <PasswordInput
            toggleLabel={toggleLabel}
            id="profile-confirm-password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            {...form.register("confirm")}
          />
          <FieldError errors={[errors.confirm]} />
        </Field>
        {serverError ? <FormErrorAlert>{serverError}</FormErrorAlert> : null}
        {done ? (
          <p role="status" className="text-sm text-primary">
            {t("profile.passwordChanged")}
          </p>
        ) : null}
      </FieldGroup>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      >
        {t("profile.changePassword")}
      </Button>
    </form>
  );
}
