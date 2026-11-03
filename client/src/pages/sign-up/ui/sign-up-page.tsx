import { useTranslation } from "react-i18next";
import { SignUpForm } from "@/features/sign-up";
import { AuthCardLayout } from "@/shared/ui/auth-card-layout";

export function SignUpPage() {
  const { t } = useTranslation();

  return (
    <AuthCardLayout title={t("auth.signUp.title")}>
      <SignUpForm />
    </AuthCardLayout>
  );
}
