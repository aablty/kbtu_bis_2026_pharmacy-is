import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { userEndpoints } from "@/shared/api";
import { useSessionStore } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/ui/field";
import { FormErrorAlert } from "@/shared/ui/form-error-alert";
import { Input } from "@/shared/ui/input";
import { type PersonalValues, personalSchema } from "../model/schemas";

export function PersonalForm() {
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => personalSchema(t), [t]);
  const form = useForm<PersonalValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: user?.full_name ?? "" },
  });
  const { errors, isSubmitting, isDirty } = form.formState;

  async function onSubmit(values: PersonalValues) {
    setSaved(false);
    setServerError(null);
    try {
      const updated = await userEndpoints.update({
        full_name: values.fullName || null,
      });
      useSessionStore.getState().setUser(updated);
      // Reset the baseline so the button goes back to disabled after saving.
      form.reset({ fullName: updated.full_name ?? "" });
      setSaved(true);
    } catch {
      setServerError(t("profile.errors.generic"));
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="profile-email">{t("auth.email")}</FieldLabel>
          <Input
            id="profile-email"
            readOnly
            value={user?.email ?? ""}
            aria-describedby="profile-email-hint"
            className="bg-muted text-muted-foreground"
          />
          <FieldDescription id="profile-email-hint">
            {t("profile.emailHint")}
          </FieldDescription>
        </Field>
        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor="profile-name">{t("auth.fullName")}</FieldLabel>
          <Input
            id="profile-name"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            {...form.register("fullName")}
          />
          <FieldError errors={[errors.fullName]} />
        </Field>
        {serverError ? <FormErrorAlert>{serverError}</FormErrorAlert> : null}
        {saved ? (
          <p role="status" className="text-sm text-primary">
            {t("profile.saved")}
          </p>
        ) : null}
      </FieldGroup>
      <Button
        type="submit"
        disabled={isSubmitting || !isDirty}
        className="w-full sm:w-auto"
      >
        {t("profile.save")}
      </Button>
    </form>
  );
}
