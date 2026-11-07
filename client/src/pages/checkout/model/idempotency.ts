export interface IdempotencyEntry {
  body: string;
  key: string;
}

/** Reuses the key while the order body is unchanged, so a retry can't create a second order. */
export function idempotencyFor(
  previous: IdempotencyEntry | null,
  body: string,
): IdempotencyEntry {
  return previous?.body === body
    ? previous
    : { body, key: crypto.randomUUID() };
}
