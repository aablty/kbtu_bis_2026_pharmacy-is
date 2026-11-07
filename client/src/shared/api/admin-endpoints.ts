import type {
  CategoryInput,
  MedicineInput,
  Supplier,
  SupplierInput,
} from "./admin-types";
import type { Category, Medicine } from "./catalog-types";
import { apiClient } from "./client";

// Writes are admin-only on the server; reads of categories/medicines are public (catalogEndpoints).
export const adminEndpoints = {
  suppliers: {
    list: () => apiClient.get<Supplier[]>("/suppliers").then((r) => r.data),
    create: (body: SupplierInput) =>
      apiClient.post<Supplier>("/suppliers", body).then((r) => r.data),
    update: (id: number, body: SupplierInput) =>
      apiClient.put<Supplier>(`/suppliers/${id}`, body).then((r) => r.data),
    remove: (id: number) => apiClient.delete(`/suppliers/${id}`),
  },
  categories: {
    create: (body: CategoryInput) =>
      apiClient.post<Category>("/categories", body).then((r) => r.data),
    update: (id: number, body: CategoryInput) =>
      apiClient.put<Category>(`/categories/${id}`, body).then((r) => r.data),
    remove: (id: number) => apiClient.delete(`/categories/${id}`),
  },
  medicines: {
    create: (body: MedicineInput) =>
      apiClient.post<Medicine>("/medicines", body).then((r) => r.data),
    update: (id: number, body: MedicineInput) =>
      apiClient.put<Medicine>(`/medicines/${id}`, body).then((r) => r.data),
    remove: (id: number) => apiClient.delete(`/medicines/${id}`),
  },
};
