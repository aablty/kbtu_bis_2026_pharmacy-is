export interface Category {
  category_id: number;
  name: string;
  name_ru: string | null;
  parent_id: number | null;
}

export interface Medicine {
  medicine_id: number;
  name: string;
  manufacturer: string | null;
  dosage_form: string | null;
  price: string;
  requires_prescription: boolean;
  stock_quantity: number;
  reorder_threshold: number;
  category_id: number;
  supplier_id: number;
  image_urls: string[];
}

export interface MedicineList {
  items: Medicine[];
  total: number;
  limit: number;
  offset: number;
  next_cursor: string | null;
}
