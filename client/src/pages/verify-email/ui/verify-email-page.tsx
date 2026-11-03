import { useTranslation } from "react-i18next";
import { VerifyEmailForm } from "@/features/sign-up";
import { AuthCardLayout } from "@/widgets/layout";

export function VerifyEmailPage() {
  const { t } = useTranslation();

  return (
    <AuthCardLayout
      title={t("auth.verify.title")}
      description={t("auth.verify.description")}
    >
      <VerifyEmailForm />
    </AuthCardLayout>
  );
}
