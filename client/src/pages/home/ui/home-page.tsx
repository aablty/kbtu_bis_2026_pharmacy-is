import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ThemeToggle } from "@/features/toggle-theme";
import { Button } from "@/shared/ui/button";

export function HomePage() {
  const { t } = useTranslation();

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <h1 className="font-heading text-4xl font-semibold">{t("home.title")}</h1>
      <p className="text-muted-foreground">{t("home.subtitle")}</p>
      <div className="flex gap-2">
        <Button asChild>
          <Link to="/sign-in">{t("auth.links.signIn")}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/sign-up">{t("auth.links.signUp")}</Link>
        </Button>
      </div>
    </main>
  );
}
