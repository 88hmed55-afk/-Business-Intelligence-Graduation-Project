from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"
    SALES_MANAGER = "sales_manager"
    INVENTORY_MANAGER = "inventory_manager"


class ReportStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class KpiCategory(str, Enum):
    FINANCE = "finance"
    SALES = "sales"
    OPERATIONS = "operations"
    MARKETING = "marketing"
    HR = "hr"
    IT = "it"
    OTHER = "other"


class KpiTrend(str, Enum):
    UP = "up"
    DOWN = "down"
    FLAT = "flat"


class CustomerStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    VIP = "vip"
    PROSPECT = "prospect"


class OrderStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"
    WALLET = "wallet"
    PAYPAL = "paypal"


class EmployeeStatus(str, Enum):
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    TERMINATED = "terminated"


class NotificationType(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"


class InventoryMovement(str, Enum):
    RECEIVED = "received"
    SHIPPED = "shipped"
    ADJUSTED = "adjusted"
    RETURNED = "returned"
    RESERVED = "reserved"
    RELEASED = "released"


class ReportExportFormat(str, Enum):
    CSV = "csv"
    XLSX = "xlsx"
    PDF = "pdf"


class ReportType(str, Enum):
    SALES = "sales"
    PROFIT = "profit"
    CUSTOMER = "customer"
    PRODUCT = "product"
    INVENTORY = "inventory"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class ActivityAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    PUBLISH = "publish"
    ARCHIVE = "archive"
    RESTORE = "restore"
    IMPORT = "import"
