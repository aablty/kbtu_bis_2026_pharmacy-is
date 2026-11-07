import { describe, expect, it } from "vitest";
import { placeOrderErrorKey } from "./place-order-error";

const httpError = (status: number, detail: string) => ({
  isAxiosError: true,
  response: { status, data: { detail } },
});

describe("placeOrderErrorKey", () => {
  it("maps stock conflicts, prescription problems and everything else", () => {
    expect(
      placeOrderErrorKey(httpError(409, "Insufficient stock for medicine 4")),
    ).toBe("checkout.errors.outOfStock");
    expect(
      placeOrderErrorKey(httpError(400, "Prescription has not been approved")),
    ).toBe("checkout.errors.prescription");
    expect(placeOrderErrorKey(httpError(500, "boom"))).toBe(
      "checkout.errors.generic",
    );
    expect(placeOrderErrorKey(new Error("network"))).toBe(
      "checkout.errors.generic",
    );
  });
});
