import { cn } from "cn";
import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  ancestorIds,
  type CategoryNode,
  categoryLabel,
} from "../model/category-tree";

export function CategoryTreeNav({
  nodes,
  selectedId,
  hrefFor,
  onNavigate,
}: {
  nodes: CategoryNode[];
  selectedId: number | null;
  hrefFor: (categoryId: number) => string;
  /** Called after a link is followed (the mobile sheet closes on it). */
  onNavigate?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(
    () => new Set(ancestorIds(nodes, selectedId)),
  );

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function branch(level: CategoryNode[]) {
    return (
      <ul className="flex flex-col gap-0.5">
        {level.map((node) => {
          const selected = node.category_id === selectedId;
          const open = expanded.has(node.category_id);
          const label = categoryLabel(node, i18n.language);
          return (
            <li key={node.category_id}>
              <div className="flex items-center">
                {node.children.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => toggle(node.category_id)}
                    aria-expanded={open}
                    aria-label={`${t(open ? "catalog.collapse" : "catalog.expand")}: ${label}`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-md md:size-7 text-muted-foreground hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <ChevronRightIcon
                      className={cn(
                        "size-4 transition-transform",
                        open && "rotate-90",
                      )}
                    />
                  </button>
                ) : (
                  <span className="size-11 shrink-0 md:size-7" />
                )}
                <Link
                  to={hrefFor(node.category_id)}
                  onClick={onNavigate}
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    "flex min-w-0 flex-1 items-center rounded-md px-2 py-2.5 text-sm hover:bg-accent md:py-1",
                    selected
                      ? "bg-accent font-semibold text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {label}
                </Link>
              </div>
              {open && node.children.length > 0 ? (
                <div className="ml-3.5 border-l pl-1">
                  {branch(node.children)}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  return branch(nodes);
}
