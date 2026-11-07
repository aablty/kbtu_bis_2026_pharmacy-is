import { apiClient } from "./client";
import type { Prescription } from "./prescription-types";

export const prescriptionEndpoints = {
  list: () =>
    apiClient.get<Prescription[]>("/prescriptions").then((r) => r.data),
};
