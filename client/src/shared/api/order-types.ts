export type FulfillmentType = "pickup" | "delivery";
export type PaymentMethod = "cash" | "card_simulated";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "ready"
  | "completed"
  | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderCreate {
  items: { medicine_id: number; quantity: number }[];
  fulfillment_type: FulfillmentType;
  delivery_address: string | null;
  payment_method: PaymentMethod;
  prescription_id: number | null;
}

export interface OrderItem {
  medicine_id: number;
  medicine_name: string;
  quantity: number;
  unit_price: string;
}

export interface Payment {
  method: PaymentMethod;
  status: PaymentStatus;
  amount: string;
  paid_at: string | null;
}

export interface OrderStatusHistory {
  status: OrderStatus;
  changed_at: string;
}

export interface Order {
  order_id: number;
  status: OrderStatus;
  fulfillment_type: FulfillmentType;
  delivery_address: string | null;
  prescription_id: number | null;
  total_amount: string;
  created_at: string;
  items: OrderItem[];
  payment: Payment | null;
  history: OrderStatusHistory[];
}
