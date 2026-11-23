export type PrescriptionStatus = "pending" | "approved" | "rejected";

export interface Prescription {
  prescription_id: number;
  customer_id: number;
  customer_name: string | null;
  customer_email: string | null;
  file_url: string;
  status: PrescriptionStatus;
  rejection_reason: string | null;
  created_at: string;
}
