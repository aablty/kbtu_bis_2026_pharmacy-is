import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ResetPasswordForm } from "@/features/password-reset";
import { AuthCardLayout } from "@/widgets/layout";

export function ResetPasswordPage() {
  const { t } = useTranslation();

  return (
    <AuthCardLayout title={t("auth.reset.title")}>
      <div className="flex flex-col gap-4">
        <ResetPasswordForm />
        <Link to="/sign-in" className="text-center text-sm underline">
          {t("auth.links.signIn")}
        </Link>
      </div>
    </AuthCardLayout>
  );
}
