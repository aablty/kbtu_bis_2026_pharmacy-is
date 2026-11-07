import { Skeleton } from "./skeleton";

/** Placeholder rows for list pages while data loads; announced as a status region. */
export function SkeletonList({
  rows = 4,
  label,
}: {
  rows?: number;
  label: string;
}) {
  return (
    <ul
      role="status"
      aria-label={label}
      aria-busy="true"
      className="flex flex-col divide-y rounded-2xl border"
    >
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
