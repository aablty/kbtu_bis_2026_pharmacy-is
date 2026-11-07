import { apiClient } from "./client";
import type { Prescription } from "./prescription-types";

export const prescriptionEndpoints = {
  list: () =>
    apiClient.get<Prescription[]>("/prescriptions").then((r) => r.data),
  upload: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiClient
      .post<Prescription>("/prescriptions", body)
      .then((r) => r.data);
  },
};
