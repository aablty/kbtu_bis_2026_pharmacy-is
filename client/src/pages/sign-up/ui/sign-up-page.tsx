import { useTranslation } from "react-i18next";
import { GoogleSignInButton } from "@/features/google-auth";
import { SignUpForm } from "@/features/sign-up";
import { AuthCardLayout } from "@/widgets/layout";

export function SignUpPage() {
  const { t } = useTranslation();

  return (
    <AuthCardLayout title={t("auth.signUp.title")}>
      <div className="flex flex-col gap-6">
        <SignUpForm />
        <GoogleSignInButton />
      </div>
    </AuthCardLayout>
  );
}
