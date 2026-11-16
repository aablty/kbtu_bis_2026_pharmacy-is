export interface Supplier {
  supplier_id: number;
  name: string;
  contact_phone: string | null;
  address: string | null;
}

export interface SupplierInput {
  name: string;
  contact_phone: string | null;
  address: string | null;
}

export interface CategoryInput {
  name: string;
  parent_id: number | null;
}

export interface MedicineInput {
  // No stock_quantity/expiry_date - both are batch-derived (see
  // client/src/pages/staff/ui/stock-panel.tsx, the Receive Stock flow).
  name: string;
  manufacturer: string | null;
  dosage_form: import("./catalog-types").DosageForm | null;
  price: string;
  requires_prescription: boolean;
  reorder_threshold: number;
  category_id: number;
  supplier_id: number;
}

export interface SaleItem {
  medicine_id: number;
  medicine_name: string;
  quantity: number;
  unit_price: string;
}

export interface Sale {
  sale_id: number;
  order_id: number | null;
  customer_id: number | null;
  employee_id: number;
  total_amount: string;
  created_at: string;
  items: SaleItem[];
}

export interface SaleCreate {
  items: { medicine_id: number; quantity: number }[];
  customer_id: number | null;
}

export interface BatchInput {
  medicine_id: number;
  supplier_id: number;
  quantity: number;
  expiry_date: string;
}

export interface Batch {
  batch_id: number;
  medicine_id: number;
  supplier_id: number;
  quantity_received: number;
  quantity_remaining: number;
  expiry_date: string;
  barcode: string;
  received_at: string;
}
