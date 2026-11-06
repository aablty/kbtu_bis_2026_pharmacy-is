import { ChevronLeftIcon, ChevronRightIcon, PackageIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/** Horizontally scrollable, snap-aligned photos; each is cropped to fill the frame. */
export function ImageStrip({
  urls,
  onClick,
}: {
  urls: string[];
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (urls.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <PackageIcon
          aria-label={t("catalog.noImage")}
          className="size-12 text-muted-foreground/40"
        />
      </div>
    );
  }

  function go(step: number) {
    const el = ref.current;
    if (el) el.scrollBy({ left: step * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="group/strip absolute inset-0">
      <div
        ref={ref}
        onScroll={(e) =>
          setIndex(
            Math.round(
              e.currentTarget.scrollLeft / e.currentTarget.clientWidth,
            ),
          )
        }
        className="flex size-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {urls.map((url) => (
          // biome-ignore lint/a11y/useKeyWithClickEvents: the title link is the keyboard path
          // biome-ignore lint/a11y/noStaticElementInteractions: same
          <img
            key={url}
            src={url}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onClick={onClick}
            className="size-full shrink-0 cursor-pointer snap-center object-contain"
          />
        ))}
      </div>
      {urls.length > 1 ? (
        <>
          {[-1, 1].map((dir) => (
            <button
              key={dir}
              type="button"
              tabIndex={-1}
              aria-label={t(dir < 0 ? "catalog.prev" : "catalog.next")}
              onClick={() => go(dir)}
              className={`absolute top-1/2 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow group-hover/strip:flex ${dir < 0 ? "left-2" : "right-2"}`}
            >
              {dir < 0 ? (
                <ChevronLeftIcon className="size-4" />
              ) : (
                <ChevronRightIcon className="size-4" />
              )}
            </button>
          ))}
          <div className="pointer-events-none absolute right-0 bottom-2 left-0 flex justify-center gap-1">
            {urls.map((url, i) => (
              <span
                key={url}
                className={`size-1.5 rounded-full ${i === index ? "bg-primary" : "bg-foreground/25"}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
