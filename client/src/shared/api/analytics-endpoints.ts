import type {
  BestSeller,
  LowStockMedicine,
  RevenueReport,
} from "./analytics-types";
import { apiClient } from "./client";

// Admin-only on the server.
export const analyticsEndpoints = {
  bestSellers: (limit: number) =>
    apiClient
      .get<BestSeller[]>("/analytics/best-sellers", { params: { limit } })
      .then((r) => r.data),
  lowStock: () =>
    apiClient
      .get<LowStockMedicine[]>("/analytics/low-stock")
      .then((r) => r.data),
  revenue: (days: number) =>
    apiClient
      .get<RevenueReport>("/analytics/revenue", { params: { days } })
      .then((r) => r.data),
};
