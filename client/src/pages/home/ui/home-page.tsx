import {
  ActivityIcon,
  BarChart3Icon,
  BellIcon,
  CreditCardIcon,
  FileTextIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router";
import { useSessionStore } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { TopBar } from "@/widgets/layout";

const FEATURE_ICONS = [
  ShieldCheckIcon,
  UserIcon,
  FileTextIcon,
  BellIcon,
  CreditCardIcon,
  ActivityIcon,
  BarChart3Icon,
] as const;

function FeatureCard({
  Icon,
  title,
  description,
}: {
  Icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <Icon className="size-6 text-primary" />
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const features = t("home.features", { returnObjects: true }) as {
    title: string;
    description: string;
  }[];

  if (user) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <div className="flex min-h-svh flex-col">
      <TopBar>
        <Button variant="ghost" asChild>
          <Link to="/sign-in">{t("auth.links.signIn")}</Link>
        </Button>
        <Button asChild>
          <Link to="/sign-up">{t("auth.links.signUp")}</Link>
        </Button>
      </TopBar>

      <main className="flex-1">
        <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center">
          <h1 className="font-heading text-4xl font-semibold text-balance sm:text-5xl">
            {t("home.title")}
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground text-pretty">
            {t("home.subtitle")}
          </p>
          <div className="flex gap-3">
            <Button size="lg" asChild>
              <Link to="/sign-up">{t("home.cta.primary")}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/sign-in">{t("home.cta.secondary")}</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                Icon={FEATURE_ICONS[index % FEATURE_ICONS.length]}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <p className="text-center text-sm text-muted-foreground">
          {t("home.footer")}
        </p>
      </footer>
    </div>
  );
}
