export { adminEndpoints } from "./admin-endpoints";
export type {
  Batch,
  BatchInput,
  CategoryInput,
  MedicineInput,
  Sale,
  SaleCreate,
  SaleItem,
  Supplier,
  SupplierInput,
} from "./admin-types";
export { analyticsEndpoints } from "./analytics-endpoints";
export type {
  BestSeller,
  ExpiringBatch,
  LowStockMedicine,
  RevenueDay,
  RevenueReport,
} from "./analytics-types";
export { authEndpoints } from "./auth-endpoints";
export type { UserProfile, UserRole, UserSearchResult } from "./auth-types";
export { catalogEndpoints } from "./catalog-endpoints";
export type { Category, Medicine, MedicineList } from "./catalog-types";
export { apiClient, apiMutator } from "./client";
export { type AuthErrorKey, authErrorKey } from "./errors";
export type {
  BatchByBarcodeResponse,
  BatchResponse,
  BatchWriteOffCreate,
  BatchWriteOffResponse,
  WastageItemResponse,
  WastageReport,
  WriteOffActivityResponse,
} from "./generated";
// Orval-generated client (client/orval.config.ts) - the only source for
// phase 1's new batch/wastage endpoints, not yet mirrored in the
// hand-written endpoint files above.
export {
  getByBarcodeBatchesByBarcodeBarcodeGet,
  getSaleSalesSaleIdGet,
  useListReceivingActivityBatchesReceivingActivityGet,
  useListWriteOffsBatchesWriteOffsGet,
  useWastageAnalyticsWastageGet,
  useWriteOffBatchBatchesBatchIdWriteOffPost,
} from "./generated";
export { notificationEndpoints } from "./notification-endpoints";
export type { AppNotification, NotificationType } from "./notification-types";
export { orderEndpoints } from "./order-endpoints";
export type {
  FulfillmentType,
  Order,
  OrderCreate,
  OrderItem,
  OrderItemBatch,
  OrderStatus,
  OrderStatusHistory,
  PaymentMethod,
  PaymentStatus,
} from "./order-types";
export { prescriptionEndpoints } from "./prescription-endpoints";
export type { Prescription, PrescriptionStatus } from "./prescription-types";
export { staffEndpoints } from "./staff-endpoints";
export { userEndpoints } from "./user-endpoints";
