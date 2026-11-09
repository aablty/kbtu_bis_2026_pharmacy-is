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
  dosage_form: DosageForm | null;
  expiry_date: string | null;
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

export type DosageForm =
  | "ampoules"
  | "aerosol"
  | "balm"
  | "gel"
  | "granules"
  | "dragee"
  | "chewing_gum"
  | "drops"
  | "capsules"
  | "vaginal_capsules"
  | "pencil"
  | "concentrate"
  | "cream"
  | "lacquer"
  | "lozenges"
  | "lotion"
  | "ointment"
  | "oil"
  | "tincture"
  | "paste"
  | "pastilles"
  | "strip"
  | "patch"
  | "dispersible_film"
  | "powder"
  | "solution"
  | "sachet"
  | "syrup"
  | "spiral"
  | "spray"
  | "suppositories"
  | "suspension"
  | "tablets"
  | "vaginal_tablets"
  | "vial"
  | "shampoo"
  | "effervescent_tablets"
  | "syringe"
  | "emulsion";
