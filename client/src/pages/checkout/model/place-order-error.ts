import { isAxiosError } from "axios";

export type PlaceOrderErrorKey =
  | "checkout.errors.outOfStock"
  | "checkout.errors.prescription"
  | "checkout.errors.generic";

export function placeOrderErrorKey(error: unknown): PlaceOrderErrorKey {
  if (!isAxiosError(error) || !error.response) {
    return "checkout.errors.generic";
  }
  const { status, data } = error.response;
  const detail = String(data?.detail ?? "");
  if (status === 409 && detail.includes("stock")) {
    return "checkout.errors.outOfStock";
  }
  if (/prescription/i.test(detail)) return "checkout.errors.prescription";
  return "checkout.errors.generic";
}
