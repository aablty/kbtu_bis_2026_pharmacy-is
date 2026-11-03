import { useTranslation } from "react-i18next";
import { GoogleSignInButton, SignInForm } from "@/features/sign-in";
import { AuthCardLayout } from "@/widgets/layout";

export function SignInPage() {
  const { t } = useTranslation();

  return (
    <AuthCardLayout title={t("auth.signIn.title")}>
      <div className="flex flex-col gap-6">
        <SignInForm />
        <GoogleSignInButton />
      </div>
    </AuthCardLayout>
  );
}
