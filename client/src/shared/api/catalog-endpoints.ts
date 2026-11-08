import type { Category, Medicine, MedicineList } from "./catalog-types";
import { apiClient } from "./client";

export const catalogEndpoints = {
  categories: () =>
    apiClient.get<Category[]>("/categories").then((r) => r.data),
  medicines: (params: {
    q?: string;
    category_id?: number;
    requires_prescription?: boolean;
    in_stock?: boolean;
    min_price?: number;
    max_price?: number;
    sort?: "name" | "price_asc" | "price_desc";
    cursor?: string;
    limit: number;
    offset: number;
  }) =>
    apiClient.get<MedicineList>("/medicines", { params }).then((r) => r.data),
  medicine: (id: number) =>
    apiClient.get<Medicine>(`/medicines/${id}`).then((r) => r.data),
};
