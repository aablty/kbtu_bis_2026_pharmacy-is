import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { AppLogo } from "@/shared/ui/app-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { TopBar } from "./top-bar";

export function AuthCardLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh flex-col">
      <TopBar />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
        <Link to="/" aria-label={t("auth.backHome")}>
          <AppLogo />
        </Link>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        <Link
          to="/"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {t("auth.backHome")}
        </Link>
      </main>
    </div>
  );
}
