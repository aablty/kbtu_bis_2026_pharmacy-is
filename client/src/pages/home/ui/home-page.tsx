import { useTranslation } from "react-i18next";
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
      <Button>{t("app.name")}</Button>
    </main>
  );
}
