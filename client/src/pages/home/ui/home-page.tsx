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
import { TopBar } from "@/widgets/layout";

const FEATURE_ICONS: ComponentType<{ className?: string }>[] = [
  ShieldCheckIcon,
  UserIcon,
  FileTextIcon,
  BellIcon,
  CreditCardIcon,
  ActivityIcon,
  BarChart3Icon,
];

export function HomePage() {
  const { t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const features = t("home.features", { returnObjects: true }) as {
    title: string;
    description: string;
  }[];

  if (user) {
    return <Navigate to="/catalog" replace />;
  }

  return (
    <div className="flex min-h-svh flex-col">
      <TopBar>
        <Button variant="ghost" asChild>
          <Link to="/catalog">{t("nav.catalog")}</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/sign-in">{t("auth.links.signIn")}</Link>
        </Button>
      </TopBar>

      <main className="flex-1">
        <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center md:py-20">
          <h1 className="font-heading text-4xl font-semibold text-balance sm:text-5xl">
            {t("home.title")}
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground text-pretty">
            {t("home.subtitle")}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/sign-up">{t("home.cta.primary")}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/sign-in">{t("home.cta.secondary")}</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-4 pb-16">
          <ul className="divide-y rounded-2xl border">
            {features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length];
              return (
                <li key={feature.title} className="flex gap-4 p-4">
                  <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-sm font-semibold">{feature.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
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
