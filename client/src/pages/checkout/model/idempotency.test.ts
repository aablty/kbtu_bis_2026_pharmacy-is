import { describe, expect, it } from "vitest";
import { idempotencyFor } from "./idempotency";

describe("idempotencyFor", () => {
  it("keeps the key for an identical retry", () => {
    const first = idempotencyFor(null, '{"a":1}');
    expect(idempotencyFor(first, '{"a":1}').key).toBe(first.key);
  });

  it("issues a new key when the order body changes", () => {
    const first = idempotencyFor(null, '{"a":1}');
    const second = idempotencyFor(first, '{"a":2}');
    expect(second.key).not.toBe(first.key);
    expect(second.body).toBe('{"a":2}');
  });
});
