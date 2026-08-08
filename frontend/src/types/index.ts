export type UserRole = "admin" | "analyst" | "viewer";
export type ReportStatus = "draft" | "published" | "archived";
export type KpiCategory =
  | "finance"
  | "sales"
  | "operations"
  | "marketing"
  | "hr"
  | "it"
  | "other";
export type KpiTrend = "up" | "down" | "flat";

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_superuser: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dashboard {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  config: Record<string, unknown>;
  is_favorite: boolean;
  is_public: boolean;
  created_by: string;
  kpi_count: number;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  name: string;
  description: string | null;
  query: string;
  status: ReportStatus;
  schedule: string | null;
  config: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Kpi {
  id: string;
  name: string;
  description: string | null;
  category: KpiCategory;
  formula: string;
  target_value: string | null;
  current_value: string | null;
  unit: string | null;
  trend: KpiTrend;
  dashboard_id: string | null;
  created_by: string;
  progress: number | null;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface MetricValue {
  label: string;
  value: number;
  delta: number | null;
  delta_percent: number | null;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  avg_current: number;
  achievement: number;
}

export interface TrendPoint {
  period: string;
  value: number;
  kpis: number;
}

export interface PerformanceItem {
  kpi_id: string;
  kpi_name: string;
  category: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  trend: string;
  achievement_pct: number | null;
  period: string | null;
}

export interface DashboardSummaryItem {
  dashboard_id: string;
  dashboard_name: string;
  is_public: boolean;
  is_favorite: boolean;
  owner_email: string;
  kpi_count: number;
}

export interface AnalyticsOverview {
  metrics: MetricValue[];
  categories: CategoryBreakdown[];
  trends: TrendPoint[];
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  message: string;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ApiErrorDetail {
  loc?: unknown[];
  msg?: string;
  type?: string;
}

export interface ApiErrorObject {
  code?: string;
  message?: string;
  details?: ApiErrorDetail[] | unknown;
}

export interface ApiErrorPayload {
  detail?: string | ApiErrorDetail[];
  message?: string;
  error?: ApiErrorObject;
}

export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
  timestamp: string;
  checks: Record<string, string>;
}

export type CustomerStatus = "active" | "inactive" | "vip" | "prospect";
export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PaymentMethod =
  | "credit_card"
  | "debit_card"
  | "bank_transfer"
  | "cash"
  | "wallet"
  | "paypal";
export type EmployeeStatus = "active" | "on_leave" | "terminated";
export type NotificationType = "info" | "success" | "warning" | "error";
export type InventoryMovementType =
  | "received"
  | "shipped"
  | "adjusted"
  | "returned"
  | "reserved"
  | "released";
export type ReportExportFormat = "csv" | "xlsx" | "pdf";
export type ActivityAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "export"
  | "publish"
  | "archive"
  | "restore"
  | "import";

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  status: CustomerStatus;
  total_orders: number;
  total_spent: string;
  notes: string | null;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_id: string | null;
  website: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  category_id: string | null;
  supplier_id: string | null;
  unit_price: string;
  cost_price: string;
  reorder_level: string;
  weight_kg: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  quantity: string;
  reserved_quantity: string;
  available_quantity: string;
  warehouse: string;
  location: string | null;
  last_restocked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovementRecord {
  id: string;
  inventory_id: string;
  product_id: string;
  movement_type: InventoryMovementType;
  quantity_change: string;
  reference: string | null;
  note: string | null;
  moved_at: string;
  created_at: string;
}

export interface TopSeller {
  product_id: string;
  product_name: string;
  sku: string;
  units_sold: number;
  revenue: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string | null;
  quantity: string;
  unit_price: string;
  discount_amount: string;
  line_total: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string | null;
  status: OrderStatus;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  shipping_fee: string;
  total_amount: string;
  currency: string;
  payment_status: string;
  order_date: string;
  delivered_at: string | null;
  notes: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  order_id: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transaction_id: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department: string;
  position: string;
  salary: string;
  hire_date: string;
  status: EmployeeStatus;
  manager_id: string | null;
  address: string | null;
  city: string | null;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  code: string;
  description: string | null;
  module: string;
  action: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleDetail extends Role {
  permissions: Permission[];
}

export interface AppSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  group_name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  notification_type: NotificationType;
  is_read: boolean;
  read_at: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  action: ActivityAction;
  module: string;
  summary: string;
  user_id: string | null;
  user_email: string | null;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SalesReportRow {
  period: string;
  order_count: number;
  units_sold: string;
  gross_revenue: string;
  discount_total: string;
  net_revenue: string;
  avg_order_value: string;
}

export interface ProfitReportRow {
  period: string;
  revenue: string;
  cogs: string;
  gross_profit: string;
  margin_pct: string;
  tax_total: string;
  net_profit: string;
}

export interface CustomerReportRow {
  customer_id: string;
  customer_name: string;
  total_orders: number;
  total_spent: string;
  avg_order_value: string;
  last_order_date: string | null;
}

export interface ProductReportRow {
  product_id: string;
  product_name: string;
  sku: string;
  category: string | null;
  units_sold: string;
  revenue: string;
  cogs: string;
  profit: string;
}

export interface InventoryReportRow {
  product_id: string;
  product_name: string;
  sku: string;
  warehouse: string;
  quantity: string;
  reserved_quantity: string;
  available_quantity: string;
  reorder_level: string;
  stock_value: string;
  status: string;
}

export interface MonthlyReportRow {
  month: string;
  order_count: number;
  units_sold: string;
  revenue: string;
  cogs: string;
  profit: string;
  margin_pct: string;
  new_customers: number;
}

export interface YearlyReportRow {
  year: number;
  order_count: number;
  revenue: string;
  cogs: string;
  profit: string;
  margin_pct: string;
  active_customers: number;
}

export interface ReportResponse<T> {
  rows: T[];
  summary: Record<string, unknown>;
  generated_at: string;
  filters: Record<string, unknown>;
}

export interface CommerceOverview {
  total_orders: number;
  revenue: string;
  cogs: string;
  gross_profit: string;
  net_profit: string;
  total_customers: number;
  total_products: number;
  avg_order_value: string;
}

export interface StatisticSnapshot {
  period: string;
  metric_key: string;
  value: string;
}

export type DatePreset = "today" | "yesterday" | "7d" | "30d" | "90d" | "this_month" | "last_month" | "this_quarter" | "last_quarter" | "this_year" | "last_year" | "all" | "custom";
