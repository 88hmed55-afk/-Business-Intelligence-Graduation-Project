import logging
import random
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.statistics_service import StatisticsService
from app.core.config import get_settings
from app.core.constants import ACTIONS, MODULES
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.infrastructure.models import (
    ActivityLog,
    Category,
    Customer,
    Employee,
    Inventory,
    InventoryMovement,
    Notification,
    Order,
    OrderItem,
    Payment,
    Permission,
    Product,
    Role,
    Setting,
    Supplier,
    User,
)
from app.infrastructure.models.dashboard import Dashboard
from app.infrastructure.models.kpi import KPI
from app.infrastructure.models.report import Report

logger = logging.getLogger("app.seed")

settings = get_settings()

_PAYMENT_METHODS = ("credit_card", "debit_card", "bank_transfer", "cash", "wallet", "paypal")
_ORDER_STATUSES = (
    ["delivered"] * 45
    + ["shipped"] * 20
    + ["processing"] * 15
    + ["pending"] * 10
    + ["cancelled"] * 6
    + ["refunded"] * 4
)

_CATALOG = [
    ("Electronics", ("Wireless Headphones", "Bluetooth Speaker", "USB-C Hub", "Mechanical Keyboard", "4K Monitor", "HD Webcam", "Smart Watch", "Portable Charger")),
    ("Computers", ("Business Laptop 15", "Ultrabook 14", "Desktop Tower", "All-in-One PC", "Gaming Laptop", "Mini PC")),
    ("Phones & Tablets", ("Smartphone 128GB", "Smartphone Pro", "Tablet 10", "Tablet Pro", "Basic Phone")),
    ("Home Appliances", ("Air Fryer", "Espresso Machine", "Robot Vacuum", "Blender", "Microwave Oven", "Electric Kettle", "Toaster")),
    ("Furniture", ("Office Chair", "Standing Desk", "Bookshelf", "Conference Table", "Filing Cabinet", "Sofa Set")),
    ("Clothing", ("Cotton T-Shirt", "Denim Jeans", "Winter Jacket", "Formal Shirt", "Hoodie", "Dress")),
    ("Shoes", ("Running Shoes", "Leather Boots", "Sneakers", "Formal Shoes", "Sandals")),
    ("Beauty & Care", ("Facial Cleanser", "Moisturizer", "Hair Dryer", "Shaving Kit", "Perfume")),
    ("Sports & Outdoors", ("Yoga Mat", "Dumbbell Set", "Camping Tent", "Bicycle", "Treadmill")),
    ("Books & Stationery", ("Business Notebook", "Desk Lamp", "Pen Set", "Marker Pack", "Planner")),
    ("Toys & Games", ("Building Blocks", "Board Game", "RC Car", "Puzzle Set", "Doll House")),
    ("Automotive", ("Car Vacuum", "Dash Camera", "Jump Starter", "Seat Cover", "Tire Inflator")),
    ("Groceries", ("Olive Oil", "Premium Coffee", "Honey Jar", "Spice Set", "Green Tea")),
    ("Health & Wellness", ("Vitamin C", "Protein Powder", "Blood Pressure Monitor", "Thermometer", "Massage Gun")),
]

_SUPPLIERS = [
    ("Global Trading Co.", "Ahmed Hassan", "Supply & Logistics", "Amsterdam", "Netherlands", "NL-284105"),
    ("TechSource Distributors", "Mona Ibrahim", "Electronics", "Munich", "Germany", "DE-992014"),
    ("Prime Goods Ltd.", "Carlos Mendes", "General Merchandise", "Lisbon", "Portugal", "PT-556801"),
    ("Alpha Wholesale", "Fatima Noor", "Consumer Goods", "Dubai", "United Arab Emirates", "AE-128733"),
    ("BlueSky Imports", "John Carter", "Apparel & Textiles", "Manchester", "United Kingdom", "GB-447210"),
    ("MedCare Supplies", "Sara Ali", "Health Products", "Toronto", "Canada", "CA-881002"),
    ("FoodSphere", "Omar Farouk", "Food & Beverage", "Cairo", "Egypt", "EG-610343"),
    ("AutoParts Depot", "David Kim", "Automotive", "Seoul", "South Korea", "KR-740119"),
    ("SmartHome Systems", "Lina Zhou", "Home Appliances", "Shenzhen", "China", "CN-304512"),
    ("EcoFurniture", "Marta Silva", "Furniture", "Porto", "Portugal", "PT-990221"),
    ("SportZone", "Alex Novak", "Sports Equipment", "Prague", "Czech Republic", "CZ-118556"),
    ("PaperTrail Office", "Elena Petrova", "Stationery", "Sofia", "Bulgaria", "BG-274910"),
    ("ToyLand International", "Raj Patel", "Toys & Games", "Mumbai", "India", "IN-551908"),
    ("BeautyBloom", "Clara Dubois", "Cosmetics", "Lyon", "France", "FR-775820"),
    ("TechShoes", "Hassan Youssef", "Footwear", "Istanbul", "Turkey", "TR-330876"),
    ("GreenFields", "Anna Kowalski", "Groceries", "Warsaw", "Poland", "PL-614307"),
]

_FIRST_NAMES = (
    "Ahmed", "Mona", "Youssef", "Sara", "Omar", "Laila", "Karim", "Nour", "Tarek", "Heba",
    "John", "Emma", "Michael", "Olivia", "James", "Sophia", "Robert", "Isabella", "David", "Mia",
    "Daniel", "Amelia", "Noah", "Harper", "Liam", "Evelyn", "Lucas", "Ava", "Leo", "Zoe",
    "Samir", "Rania", "Khaled", "Dina", "Hassan", "Farah", "Bassem", "Salma", "Wael", "Nadia",
    "Ali", "Huda", "Mahmoud", "Reem", "Ibrahim", "Yasmin", "Mostafa", "Shaimaa", "Adel", "Omnia",
)
_LAST_NAMES = (
    "Hassan", "Ali", "Mohamed", "Ibrahim", "Ahmed", "Mahmoud", "Farouk", "Youssef", "Omar", "Khalil",
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Saad", "Nabil", "Fawzy", "Rashid", "Saleh", "Gamal", "Mansour", "Shaker", "Zaki", "Hany",
    "Tawfik", "Barakat", "Shehata", "Ezzat", "Fahmy", "Samy", "Nassar", "Hammouda", "El-Sayed", "Abbas",
)

_DEPARTMENTS = ("Sales", "Marketing", "Finance", "Operations", "Human Resources", "IT", "Support")

_SETTINGS = [
    ("company.name", {"value": "Nova BI"}, "company", "Company display name.", True),
    ("company.currency", {"value": "USD"}, "company", "Default currency code.", True),
    ("company.timezone", {"value": "UTC"}, "company", "Default timezone.", True),
    ("company.address", {"value": "1 Business Park, Nova City"}, "company", "Registered company address.", True),
    ("billing.tax_rate", {"value": 7.5}, "billing", "Default VAT rate percent.", True),
    ("billing.invoice_prefix", {"value": "INV"}, "billing", "Invoice numbering prefix.", False),
    ("notifications.low_stock_threshold", {"value": 10}, "notifications", "Alert threshold for low stock.", True),
    ("notifications.order_followup_days", {"value": 3}, "notifications", "Days before order follow-up.", True),
    ("security.password_min_length", {"value": 8}, "security", "Minimum password length.", True),
    ("security.session_timeout_minutes", {"value": 60}, "security", "Session idle timeout.", False),
    ("reporting.default_range_days", {"value": 30}, "reporting", "Default report range in days.", True),
    ("reporting.export_limit", {"value": 10000}, "reporting", "Maximum export rows.", False),
]


def _now(offset_days: int = 0) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=offset_days)


# ---------------------------------------------------------------------------
# Commerce seeding helpers
# ---------------------------------------------------------------------------
def _seed_roles_permissions(db: Session) -> None:
    permissions: dict[str, Permission] = {}
    for module in MODULES:
        for action in ACTIONS:
            code = f"{module}:{action}"
            permissions[code] = Permission(
                id=uuid.uuid4(),
                code=code,
                module=module,
                action=action,
                description=f"Allows {action} on {module}.",
                created_at=_now(180),
                updated_at=_now(0),
            )
    db.add_all(permissions.values())
    db.flush()

    read_all = [f"{m}:read" for m in MODULES]
    export_perm = ["export:export"]

    def role(name: str, description: str, codes: List[str]) -> None:
        entity = Role(
            id=uuid.uuid4(),
            name=name,
            description=description,
            is_system=True,
            created_at=_now(180),
            updated_at=_now(0),
        )
        entity.permissions = [permissions[c] for c in codes if c in permissions]
        db.add(entity)

    role(
        "admin",
        "Full system access.",
        [f"{m}:{a}" for m in MODULES for a in ACTIONS],
    )
    role(
        "analyst",
        "Read analytics, reports, dashboards and export.",
        read_all + export_perm + ["reports:publish"],
    )
    role(
        "viewer",
        "Read-only access to all modules.",
        read_all,
    )
    role(
        "sales_manager",
        "Manage customers, orders and payments.",
        read_all
        + [f"{m}:{a}" for m in ("customers", "orders", "payments") for a in ("create", "update", "delete")]
        + ["export:export"],
    )
    role(
        "inventory_manager",
        "Manage products, categories, suppliers and inventory.",
        read_all
        + [
            f"{m}:{a}"
            for m in ("products", "categories", "suppliers", "inventory")
            for a in ("create", "update", "delete")
        ]
        + ["export:export"],
    )


def _seed_settings(db: Session) -> None:
    for key, value, group, description, is_public in _SETTINGS:
        db.add(
            Setting(
                id=uuid.uuid4(),
                key=key,
                value=value,
                group_name=group,
                description=description,
                is_public=is_public,
                created_at=_now(150),
                updated_at=_now(0),
            )
        )


def _seed_catalog(db: Session, rng: random.Random) -> tuple[List[Category], List[Product]]:
    categories: List[Category] = []
    products: List[Product] = []
    sku_counter = 0
    for cat_index, (cat_name, items) in enumerate(_CATALOG, start=1):
        slug = cat_name.lower().replace(" & ", "-").replace(" ", "-")
        category = Category(
            id=uuid.uuid4(),
            name=cat_name,
            slug=slug,
            description=f"Products in the {cat_name} range.",
            parent_id=None,
            sort_order=cat_index * 10,
            created_at=_now(170),
            updated_at=_now(0),
        )
        categories.append(category)
        db.add(category)
        db.flush()
        for item_index, name in enumerate(items, start=1):
            sku_counter += 1
            unit_price = Decimal(str(rng.choice((19, 29, 39, 49, 59, 79, 99, 129, 199, 249, 399, 599))))
            cost_price = (unit_price * Decimal("0.6")).quantize(Decimal("0.01"))
            product = Product(
                id=uuid.uuid4(),
                name=name,
                sku=f"SKU-{cat_index:03d}-{item_index:03d}",
                barcode=f"{rng.randint(1000000000, 9999999999)}",
                description=f"{name} - premium quality business catalog item.",
                category_id=category.id,
                supplier_id=None,
                unit_price=unit_price,
                cost_price=cost_price,
                reorder_level=Decimal(str(rng.randint(5, 20))),
                weight_kg=Decimal(str(rng.choice((0.2, 0.5, 1.0, 2.5, 5.0, 10.0)))),
                is_active=True,
                created_at=_now(rng.randint(120, 170)),
                updated_at=_now(0),
            )
            products.append(product)
            db.add(product)
    db.flush()
    return categories, products


def _seed_suppliers(db: Session) -> List[Supplier]:
    suppliers: List[Supplier] = []
    for index, (name, contact, category, city, country, tax_id) in enumerate(_SUPPLIERS):
        supplier = Supplier(
            id=uuid.uuid4(),
            name=name,
            contact_name=contact,
            email=f"{contact.lower().replace(' ', '.')}@supplier.dev",
            phone=f"+1 555 {1000 + index * 37:04d}",
            address=f"{index * 7 % 900 + 1} Trade Avenue",
            city=city,
            country=country,
            tax_id=tax_id,
            website=f"https://www.{name.lower().replace(' ', '').replace('.', '')}.com",
            is_active=True,
            created_at=_now(index * 3 % 120),
            updated_at=_now(0),
        )
        suppliers.append(supplier)
        db.add(supplier)
    db.flush()
    return suppliers


def _seed_customers(db: Session, rng: random.Random, count: int = 150) -> List[Customer]:
    customers: List[Customer] = []
    used_emails: set[str] = set()
    for i in range(count):
        first = rng.choice(_FIRST_NAMES)
        last = rng.choice(_LAST_NAMES)
        base_email = f"{first}.{last}".lower().replace(" ", ".")
        email = base_email
        suffix = 1
        while email in used_emails:
            email = f"{base_email}{suffix}"
            suffix += 1
        used_emails.add(email)
        status = rng.choices(("active", "vip", "prospect", "inactive"), weights=(62, 15, 18, 5))[0]
        company = f"{last} Enterprises" if rng.random() < 0.45 else None
        customers.append(
            Customer(
                id=uuid.uuid4(),
                first_name=first,
                last_name=last,
                email=email,
                phone=f"+1 555 {rng.randint(1000, 9999)}",
                company=company,
                address=f"{rng.randint(1, 999)} Market Street",
                city=rng.choice(("Cairo", "Alexandria", "Dubai", "Riyadh", "New York", "London", "Berlin", "Paris", "Toronto", "Madrid")),
                country=rng.choice(("Egypt", "UAE", "Saudi Arabia", "USA", "United Kingdom", "Germany", "France", "Canada", "Spain")),
                status=status,
                notes=None,
                created_at=_now(rng.randint(5, 170)),
                updated_at=_now(0),
            )
        )
    db.add_all(customers)
    db.flush()
    return customers


def _seed_employees(db: Session, admin: User, rng: random.Random, count: int = 32) -> List[Employee]:
    employees: List[Employee] = []
    used_emails: set[str] = set()
    for i in range(count):
        first = rng.choice(_FIRST_NAMES)
        last = rng.choice(_LAST_NAMES)
        email = f"{first}.{last}".lower() + f"{i}" if f"{first}.{last}".lower() in used_emails else f"{first}.{last}".lower()
        used_emails.add(email)
        employees.append(
            Employee(
                id=uuid.uuid4(),
                user_id=admin.id if i == 0 else None,
                first_name=first,
                last_name=last,
                email=f"{email}@nova.dev",
                phone=f"+1 555 {rng.randint(1000, 9999)}",
                department=rng.choice(_DEPARTMENTS),
                position=rng.choice(("Associate", "Senior Associate", "Specialist", "Manager", "Director", "Coordinator")),
                salary=Decimal(str(rng.choice((30000, 40000, 55000, 70000, 90000, 120000)))),
                hire_date=_now(rng.randint(30, 900)),
                status=rng.choices(("active", "on_leave", "terminated"), weights=(85, 10, 5))[0],
                manager_id=None,
                address=f"{rng.randint(1, 999)} Business Ave",
                city=rng.choice(("Cairo", "New York", "London", "Berlin", "Madrid")),
                created_at=_now(rng.randint(30, 900)),
                updated_at=_now(0),
            )
        )
    db.add_all(employees)
    db.flush()
    for index, employee in enumerate(employees):
        if index > 0 and index % 5 != 0:
            employee.manager_id = employees[index - 1].id
        employee.updated_at = _now(0)
    return employees


def _seed_orders(
    db: Session,
    customers: List[Customer],
    products: List[Product],
    rng: random.Random,
    count: int = 1200,
) -> None:
    order_counter = 0
    for i in range(count):
        order_counter += 1
        customer = rng.choice(customers)
        status = rng.choice(_ORDER_STATUSES)
        order_date = _now(rng.randint(0, 179))

        chosen = rng.sample(products, k=rng.randint(1, 4))
        items: List[OrderItem] = []
        subtotal = Decimal("0")
        discount_total = Decimal("0")
        for product in chosen:
            quantity = Decimal(str(rng.choice((1, 1, 1, 2, 2, 3))))
            unit_price = product.unit_price
            line_total = (unit_price * quantity).quantize(Decimal("0.01"))
            discount = Decimal("0")
            if rng.random() < 0.15:
                discount = (line_total * Decimal(str(rng.randint(1, 10))) / Decimal(100)).quantize(Decimal("0.01"))
            items.append(
                OrderItem(
                    id=uuid.uuid4(),
                    order_id=uuid.uuid4(),
                    product_id=product.id,
                    quantity=quantity,
                    unit_price=unit_price,
                    discount_amount=discount,
                    line_total=line_total - discount,
                    created_at=order_date,
                    updated_at=order_date,
                )
            )
            subtotal += line_total - discount
            discount_total += discount

        tax_amount = (subtotal * Decimal("0.075")).quantize(Decimal("0.01"))
        shipping_fee = Decimal("0") if subtotal >= Decimal("100") else Decimal("9.99")
        total_amount = subtotal + tax_amount + shipping_fee

        if status in ("cancelled", "refunded"):
            payment_status = "refunded"
        else:
            roll = rng.random()
            if roll < 0.75:
                payment_status = "paid"
            elif roll < 0.92:
                payment_status = "partial"
            else:
                payment_status = "unpaid"

        order = Order(
            id=uuid.uuid4(),
            order_number=f"ORD-{order_date.strftime('%Y%m%d')}-{order_counter:08d}",
            customer_id=customer.id,
            status=status,
            subtotal=subtotal,
            discount_amount=discount_total,
            tax_amount=tax_amount,
            shipping_fee=shipping_fee,
            total_amount=total_amount,
            currency="USD",
            payment_status=payment_status,
            order_date=order_date,
            delivered_at=order_date + timedelta(days=rng.randint(1, 6)) if status == "delivered" else None,
            notes=None,
            created_at=order_date,
            updated_at=order_date,
        )
        order.items = items
        db.add(order)
        db.flush()

        if payment_status == "paid":
            paid_at = order_date + timedelta(days=rng.randint(0, 2))
            db.add(
                Payment(
                    id=uuid.uuid4(),
                    payment_number=f"PAY-{paid_at.strftime('%Y%m%d')}-{order_counter:08d}",
                    order_id=order.id,
                    amount=total_amount,
                    method=rng.choice(_PAYMENT_METHODS),
                    status="completed",
                    transaction_id=f"TXN-{uuid.uuid4().hex[:14].upper()}",
                    paid_at=paid_at,
                    notes=None,
                    created_at=paid_at,
                    updated_at=paid_at,
                )
            )
        elif payment_status == "partial":
            paid_at = order_date + timedelta(days=rng.randint(0, 2))
            db.add(
                Payment(
                    id=uuid.uuid4(),
                    payment_number=f"PAY-{paid_at.strftime('%Y%m%d')}-{order_counter:08d}",
                    order_id=order.id,
                    amount=(total_amount / Decimal("2")).quantize(Decimal("0.01")),
                    method=rng.choice(_PAYMENT_METHODS),
                    status="completed",
                    transaction_id=f"TXN-{uuid.uuid4().hex[:14].upper()}",
                    paid_at=paid_at,
                    notes=None,
                    created_at=paid_at,
                    updated_at=paid_at,
                )
            )
        elif status == "refunded":
            db.add(
                Payment(
                    id=uuid.uuid4(),
                    payment_number=f"PAY-{order_date.strftime('%Y%m%d')}-{order_counter:08d}",
                    order_id=order.id,
                    amount=total_amount,
                    method="bank_transfer",
                    status="refunded",
                    transaction_id=f"TXN-{uuid.uuid4().hex[:14].upper()}",
                    paid_at=order_date + timedelta(days=1),
                    notes="Full refund for cancelled order.",
                    created_at=order_date,
                    updated_at=order_date,
                )
            )

        if i % 250 == 0:
            db.flush()

    db.flush()
    spent: dict[uuid.UUID, Decimal] = {}
    orders_count: dict[uuid.UUID, int] = {}
    for customer in customers:
        spent[customer.id] = Decimal("0")
        orders_count[customer.id] = 0
    rows = db.execute(
        select(Order.customer_id, Order.total_amount, Order.status)
        .where(Order.is_deleted.is_(False), Order.status.not_in(("cancelled", "refunded")))
    ).all()
    for customer_id, total, status in rows:
        orders_count[customer_id] = orders_count.get(customer_id, 0) + 1
        spent[customer_id] = spent.get(customer_id, Decimal("0")) + (total or Decimal("0"))
    for customer in customers:
        customer.total_orders = orders_count.get(customer.id, 0)
        customer.total_spent = spent.get(customer.id, Decimal("0"))
        customer.updated_at = _now(0)


def _seed_inventory(db: Session, products: List[Product], rng: random.Random) -> None:
    for product in products:
        reorder = product.reorder_level
        quantity = Decimal(str(rng.randint(0, 120)))
        inventory = Inventory(
            id=uuid.uuid4(),
            product_id=product.id,
            quantity=quantity,
            reserved_quantity=Decimal("0"),
            warehouse="main",
            location=f"A{rng.randint(1, 9)}-{rng.randint(1, 30)}",
            last_restocked_at=_now(rng.randint(1, 60)),
            created_at=_now(rng.randint(60, 170)),
            updated_at=_now(0),
        )
        db.add(inventory)
        db.flush()
        db.add(
            InventoryMovement(
                id=uuid.uuid4(),
                inventory_id=inventory.id,
                product_id=product.id,
                movement_type="received",
                quantity_change=quantity,
                reference="INIT-STOCK",
                note="Initial stock seeding.",
                moved_at=inventory.last_restocked_at,
                created_at=inventory.last_restocked_at,
                updated_at=inventory.last_restocked_at,
            )
        )


def _seed_notifications(db: Session, admin: User, analyst: User) -> None:
    for user in (admin, analyst):
        db.add_all(
            [
                Notification(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    title="Welcome to Nova BI",
                    body="Your workspace is ready. Explore dashboards, reports and the new commerce modules.",
                    notification_type="info",
                    is_read=False,
                    read_at=None,
                    data={},
                    created_at=_now(5),
                    updated_at=_now(5),
                ),
                Notification(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    title="Low stock alert",
                    body="Several products are below their reorder level. Review the inventory report.",
                    notification_type="warning",
                    is_read=False,
                    read_at=None,
                    data={"module": "inventory"},
                    created_at=_now(1),
                    updated_at=_now(1),
                ),
            ]
        )


def _seed_activity_logs(db: Session, admin: User, analyst: User, rng: random.Random, count: int = 40) -> None:
    actions = ("login", "create", "update", "delete", "export")
    modules = ("customers", "orders", "products", "inventory", "reports", "dashboards")
    for i in range(count):
        db.add(
            ActivityLog(
                id=uuid.uuid4(),
                user_id=admin.id if i % 3 else analyst.id,
                action=rng.choice(actions),
                module=rng.choice(modules),
                entity_type=rng.choice(("Customer", "Order", "Product", "Report")),
                entity_id=uuid.uuid4(),
                summary=f"Performed {rng.choice(actions)} action on {rng.choice(modules)}.",
                details={"source": "seed"},
                ip_address="127.0.0.1",
                user_agent="Nova BI Seeder",
                created_at=_now(rng.randint(0, 90)),
                updated_at=_now(0),
            )
        )


def run_seed() -> None:
    """Idempotently create bootstrap users, BI data and a rich commerce dataset."""
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == settings.ADMIN_EMAIL))
        if existing is not None:
            logger.info("Seed data already present, skipping.")
            return

        admin = User(
            id=uuid.uuid4(),
            email=settings.ADMIN_EMAIL,
            username=settings.ADMIN_USERNAME,
            full_name=settings.ADMIN_FULL_NAME,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            role="admin",
            is_active=True,
            is_superuser=True,
            created_at=_now(180),
            updated_at=_now(0),
        )
        analyst = User(
            id=uuid.uuid4(),
            email="analyst@bisystem.dev",
            username="analyst",
            full_name="Analytics Analyst",
            hashed_password=hash_password("Analyst@1234"),
            role="analyst",
            is_active=True,
            is_superuser=False,
            created_at=_now(150),
            updated_at=_now(0),
        )
        db.add_all([admin, analyst])
        db.flush()

        exec_dash = Dashboard(
            id=uuid.uuid4(),
            name="Executive Overview",
            slug="executive-overview",
            description="High-level business health at a glance.",
            config={"columns": 3, "theme": "premium"},
            is_favorite=True,
            is_public=True,
            created_by=admin.id,
            created_at=_now(120),
            updated_at=_now(0),
        )
        sales_dash = Dashboard(
            id=uuid.uuid4(),
            name="Sales Performance",
            slug="sales-performance",
            description="Revenue, pipeline and quota attainment.",
            config={"columns": 2, "theme": "premium"},
            is_favorite=False,
            is_public=True,
            created_by=admin.id,
            created_at=_now(100),
            updated_at=_now(0),
        )
        db.add_all([exec_dash, sales_dash])

        db.add_all(
            [
                Report(
                    id=uuid.uuid4(),
                    name="Monthly Revenue Report",
                    description="Top-line revenue by segment and region.",
                    query="SELECT segment, SUM(revenue) FROM orders GROUP BY segment;",
                    status="published",
                    schedule="0 6 1 * *",
                    config={"format": "pdf"},
                    created_by=admin.id,
                    created_at=_now(90),
                    updated_at=_now(2),
                ),
                Report(
                    id=uuid.uuid4(),
                    name="Customer Churn Analysis",
                    description="Churn drivers and retention cohorts.",
                    query="SELECT month, churn_rate FROM churn ORDER BY month;",
                    status="published",
                    schedule="0 6 * * 1",
                    config={"format": "xlsx"},
                    created_by=admin.id,
                    created_at=_now(80),
                    updated_at=_now(4),
                ),
                Report(
                    id=uuid.uuid4(),
                    name="Operations Efficiency",
                    description="Throughput, downtime and SLA adherence.",
                    query="SELECT plant, AVG(downtime_hours) FROM ops GROUP BY plant;",
                    status="draft",
                    schedule=None,
                    config={"format": "pdf"},
                    created_by=analyst.id,
                    created_at=_now(60),
                    updated_at=_now(6),
                ),
            ]
        )

        kpi_specs = [
            ("Revenue Growth", "finance", "sales_dash", "percent", "up", 25),
            ("Active Users", "it", "exec_dash", "users", "up", 100000),
            ("Customer Satisfaction (NPS)", "marketing", "exec_dash", "points", "up", 70),
            ("Order Fulfillment Time", "operations", "sales_dash", "hours", "down", 24),
            ("Quota Attainment", "sales", "sales_dash", "percent", "up", 100),
            ("Employee Retention", "hr", None, "percent", "up", 95),
        ]

        now = _now(0)
        for i in range(6):
            month_ago = now - timedelta(days=(5 - i) * 28)
            base = 55 + i * 7
            for name, category, dash_key, unit, trend, target in kpi_specs:
                dashboard = {"exec_dash": exec_dash, "sales_dash": sales_dash}.get(dash_key)
                if category == "operations":
                    current = round(36 - i * 2, 1)
                    target = 24
                elif category == "hr":
                    current = round(80 + i * 2, 1)
                elif category == "marketing":
                    current = round(42 + i * 4, 1)
                elif category == "it":
                    current = float(55000 + i * 6000)
                elif category == "sales":
                    current = round(62 + i * 6, 1)
                else:
                    current = round(base * 0.8, 1)
                db.add(
                    KPI(
                        id=uuid.uuid4(),
                        name=name,
                        description=f"Monthly measure of {name.lower()}.",
                        category=category,
                        formula=f"computed for {name.lower()}",
                        target_value=target,
                        current_value=current,
                        unit=unit,
                        trend=trend,
                        dashboard_id=dashboard.id if dashboard else None,
                        created_by=admin.id,
                        created_at=month_ago,
                        updated_at=month_ago,
                    )
                )

        # ------------------------------------------------------------------
        # Commerce modules
        # ------------------------------------------------------------------
        rng = random.Random(42)
        _seed_roles_permissions(db)
        _seed_settings(db)
        categories, products = _seed_catalog(db, rng)
        suppliers = _seed_suppliers(db)
        for index, product in enumerate(products):
            product.supplier_id = suppliers[index % len(suppliers)].id
        customers = _seed_customers(db, rng)
        employees = _seed_employees(db, admin, rng)
        _seed_orders(db, customers, products, rng)
        _seed_inventory(db, products, rng)
        _seed_notifications(db, admin, analyst)
        _seed_activity_logs(db, admin, analyst, rng)

        db.flush()
        StatisticsService(db).refresh_range(180)

        db.commit()
        logger.info(
            "Seeded admin user, BI data and commerce dataset "
            "(%d categories, %d products, %d suppliers, %d customers, %d employees, 1200 orders).",
            len(categories),
            len(products),
            len(suppliers),
            len(customers),
            len(employees),
        )
    except Exception:
        db.rollback()
        logger.exception("Seeding failed")
        raise
    finally:
        db.close()
