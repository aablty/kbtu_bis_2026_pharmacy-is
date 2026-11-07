export type PrescriptionStatus = "pending" | "approved" | "rejected";

export interface Prescription {
  prescription_id: number;
  status: PrescriptionStatus;
  rejection_reason: string | null;
  created_at: string;
}
