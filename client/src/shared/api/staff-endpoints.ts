import type { Sale, SaleCreate } from "./admin-types";
import { apiClient } from "./client";
import type { Order, OrderStatus } from "./order-types";

// Staff-only endpoints (admin, pharmacist, cashier); the server enforces the role per route.
export const staffEndpoints = {
  orders: {
    list: () => apiClient.get<Order[]>("/orders").then((r) => r.data),
    updateStatus: (orderId: number, status: OrderStatus, pickupCode?: string) =>
      apiClient
        .patch<Order>(`/orders/${orderId}/status`, {
          status,
          pickup_code: pickupCode ?? null,
        })
        .then((r) => r.data),
  },
  sales: {
    list: () => apiClient.get<Sale[]>("/sales").then((r) => r.data),
    create: (body: SaleCreate) =>
      apiClient.post<Sale>("/sales", body).then((r) => r.data),
  },
  prescriptions: {
    review: (prescriptionId: number, approve: boolean, reason?: string) =>
      apiClient
        .patch(`/prescriptions/${prescriptionId}/review`, {
          approve,
          reason: reason ?? null,
        })
        .then((r) => r.data),
  },
};
