export interface BestSeller {
  medicine_id: number;
  medicine_name: string;
  units_sold: number;
}

export interface LowStockMedicine {
  medicine_id: number;
  name: string;
  stock_quantity: number;
  reorder_threshold: number;
}

export interface RevenueDay {
  date: string;
  total_revenue: string;
}

export interface RevenueReport {
  days: RevenueDay[];
  total_revenue: string;
}
