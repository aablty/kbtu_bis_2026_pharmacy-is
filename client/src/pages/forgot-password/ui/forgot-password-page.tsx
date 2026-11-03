import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ForgotPasswordForm } from "@/features/password-reset";
import { AuthCardLayout } from "@/widgets/layout";

export function ForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <AuthCardLayout title={t("auth.forgot.title")}>
      <div className="flex flex-col gap-4">
        <ForgotPasswordForm />
        <Link to="/sign-in" className="text-center text-sm underline">
          {t("auth.links.signIn")}
        </Link>
      </div>
    </AuthCardLayout>
  );
}
