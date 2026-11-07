import { apiClient } from "./client";
import type { Order, OrderCreate } from "./order-types";

export const orderEndpoints = {
  /** Same key on a retry of the same order makes the server return the first result instead of a second order. */
  place: (body: OrderCreate, idempotencyKey: string) =>
    apiClient
      .post<Order>("/orders", body, {
        headers: { "Idempotency-Key": idempotencyKey },
      })
      .then((r) => r.data),
  get: (orderId: number) =>
    apiClient.get<Order>(`/orders/${orderId}`).then((r) => r.data),
};
