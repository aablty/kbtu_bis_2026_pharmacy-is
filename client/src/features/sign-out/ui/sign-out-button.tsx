import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { endSession } from "@/shared/auth";
import { Button } from "@/shared/ui/button";

export function SignOutButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  function onSignOut() {
    endSession();
    navigate("/sign-in", { replace: true });
  }

  return (
    <Button variant="outline" onClick={onSignOut}>
      {t("auth.signOut")}
    </Button>
  );
}
