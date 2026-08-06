"""Central application constants."""

ROLE_ADMIN = "admin"
ROLE_ANALYST = "analyst"
ROLE_VIEWER = "viewer"
ROLE_SALES_MANAGER = "sales_manager"
ROLE_INVENTORY_MANAGER = "inventory_manager"
VALID_ROLES = (
    ROLE_ADMIN,
    ROLE_ANALYST,
    ROLE_VIEWER,
    ROLE_SALES_MANAGER,
    ROLE_INVENTORY_MANAGER,
)

REPORT_STATUS_DRAFT = "draft"
REPORT_STATUS_PUBLISHED = "published"
REPORT_STATUS_ARCHIVED = "archived"
VALID_REPORT_STATUSES = (REPORT_STATUS_DRAFT, REPORT_STATUS_PUBLISHED, REPORT_STATUS_ARCHIVED)

KPI_CATEGORIES = ("finance", "sales", "operations", "marketing", "hr", "it", "other")
KPI_TRENDS = ("up", "down", "flat")

CUSTOMER_STATUSES = ("active", "inactive", "vip", "prospect")
ORDER_STATUSES = ("pending", "processing", "shipped", "delivered", "cancelled", "refunded")
PAYMENT_STATUSES = ("pending", "completed", "failed", "refunded")
PAYMENT_METHODS = ("credit_card", "debit_card", "bank_transfer", "cash", "wallet", "paypal")
EMPLOYEE_STATUSES = ("active", "on_leave", "terminated")
NOTIFICATION_TYPES = ("info", "success", "warning", "error")
INVENTORY_MOVEMENTS = ("received", "shipped", "adjusted", "returned", "reserved", "released")
REPORT_TYPES = ("sales", "profit", "customer", "product", "inventory", "monthly", "yearly")
EXPORT_FORMATS = ("csv", "xlsx", "pdf")

# ---------------------------------------------------------------------------
# RBAC permission codes
# ---------------------------------------------------------------------------
MODULES = (
    "customers",
    "products",
    "categories",
    "suppliers",
    "orders",
    "payments",
    "inventory",
    "employees",
    "reports",
    "dashboards",
    "kpis",
    "analytics",
    "users",
    "roles",
    "permissions",
    "settings",
    "notifications",
    "activity_logs",
    "export",
)
ACTIONS = ("read", "create", "update", "delete", "export", "publish")

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

DATABASE_TIMEOUT_SECONDS = 5

# Export defaults
EXPORT_MAX_ROWS = 10_000
EXPORT_CHUNK_SIZE = 1_000

# Statistics refresh interval (seconds)
STATISTICS_REFRESH_INTERVAL_SECONDS = 300

# Cache keys
CACHE_OVERVIEW_KEY = "nova:analytics:overview"
CACHE_STATISTICS_KEY = "nova:stats:snapshot"
CACHE_STATISTICS_TTL_SECONDS = 300
