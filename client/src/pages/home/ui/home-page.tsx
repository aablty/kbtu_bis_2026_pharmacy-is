import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";

export function HomePage() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-heading font-semibold">{t("home.title")}</h1>
      <p className="text-muted-foreground">{t("home.subtitle")}</p>
      <Button>{t("app.name")}</Button>
    </main>
  );
}
