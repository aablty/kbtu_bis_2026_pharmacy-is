import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/shared/ui/button";
import { pageWindow } from "../model/page-window";

export function PageNumbers({
  page,
  lastPage,
  hrefFor,
}: {
  page: number;
  lastPage: number;
  /** `sequential` marks the plain next-page step, which can ride a cursor. */
  hrefFor: (page: number, sequential?: boolean) => string;
}) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("catalog.pagination")}
      className="flex flex-wrap items-center justify-center gap-1"
    >
      <Button
        asChild
        variant="ghost"
        size="icon"
        disabled={page <= 1}
        aria-label={t("catalog.prev")}
      >
        <Link to={hrefFor(Math.max(1, page - 1))}>
          <ChevronLeftIcon />
        </Link>
      </Button>
      {pageWindow(page, lastPage).map((item, i) =>
        item === "gap" ? (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: gaps have no identity
            key={`gap-${i}`}
            aria-hidden
            className="px-1 text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Button
            key={item}
            asChild
            size="icon"
            variant={item === page ? "default" : "ghost"}
          >
            <Link
              to={hrefFor(item)}
              aria-current={item === page ? "page" : undefined}
              aria-label={t("catalog.goToPage", { page: item })}
            >
              {item}
            </Link>
          </Button>
        ),
      )}
      <Button
        asChild
        variant="ghost"
        size="icon"
        disabled={page >= lastPage}
        aria-label={t("catalog.next")}
      >
        <Link to={hrefFor(Math.min(lastPage, page + 1), true)}>
          <ChevronRightIcon />
        </Link>
      </Button>
    </nav>
  );
}
