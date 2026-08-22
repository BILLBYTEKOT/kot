import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from motor.core import AgnosticDatabase
from typing import Optional
from .config import settings


class Database:
    client: AsyncIOMotorClient = None
    db: AgnosticDatabase = None


db = Database()


async def get_database() -> AsyncIOMotorDatabase:
    """Get database connection"""
    if db.client is None:
        await connect_to_mongo()
    return db.db


async def connect_to_mongo():
    """Initialize MongoDB connection with optimized pooling."""
    client_options = {
        "maxPoolSize": 50,
        "minPoolSize": 10,
        "maxIdleTimeMS": 30000,
        "serverSelectionTimeoutMS": 5000,
        "connectTimeoutMS": 15000,
        "socketTimeoutMS": 30000,
        "waitQueueTimeoutMS": 10000,
        "retryWrites": True,
        "w": "majority",
    }

    db.client = AsyncIOMotorClient(settings.MONGODB_URI, **client_options)
    db.db = db.client[settings.MONGODB_NAME]

    try:
        await db.db.command("ping")
        print("✅ Connected to MongoDB with optimized pooling")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        raise

    await create_indexes()


async def close_mongo_connection():
    """Close MongoDB connection"""
    if db.client is not None:
        db.client.close()
        print("✅ Closed MongoDB connection")


async def _safe_index(collection, keys, name, **kwargs):
    """Create index, skip if already exists."""
    try:
        await collection.create_index(keys, name=name, **kwargs)
    except Exception as e:
        if "already exists" not in str(e).lower() and "IndexOptionsConflict" not in str(e):
            print(f"⚠️  Index {name} failed: {e}")


async def create_indexes():
    """
    Create all performance-critical indexes.

    Priority order:
    1. users.id          — hit on EVERY authenticated request (get_current_user)
    2. orders.id+org     — hit on every order detail/update
    3. orders.org+status+created_at — active orders (kitchen, orders page)
    4. Everything else
    """
    d = db.db

    # ── USERS ─────────────────────────────────────────────────────────────────
    # get_current_user: find_one({"id": user_id}) — EVERY request
    await _safe_index(d.users, [("id", 1)], "idx_users_id", unique=True)
    # check_subscription: find_one({"id": org_id, "role": "admin"})
    await _safe_index(d.users, [("id", 1), ("role", 1)], "idx_users_id_role")
    # login by username_lower (new records)
    await _safe_index(d.users, [("username_lower", 1)], "idx_users_username_lower", sparse=True)
    # login by email / password reset
    await _safe_index(d.users, [("email", 1)], "idx_users_email", unique=True, sparse=True)
    # referral code exact match
    await _safe_index(d.users, [("referral_code", 1)], "idx_users_referral_code", sparse=True)
    # staff listing
    await _safe_index(d.users, [("organization_id", 1)], "idx_users_org_id", sparse=True)

    # ── ORDERS ────────────────────────────────────────────────────────────────
    # find_one({"id": order_id, "organization_id": ...}) — every order op
    await _safe_index(d.orders, [("id", 1), ("organization_id", 1)], "idx_orders_id_org")
    # Active orders: org + status + created_at — kitchen, orders page, counter sale
    await _safe_index(
        d.orders,
        [("organization_id", 1), ("status", 1), ("created_at", -1)],
        "idx_orders_org_status_created"
    )
    # Date range queries: reports, today's bills
    await _safe_index(
        d.orders,
        [("organization_id", 1), ("created_at", -1)],
        "idx_orders_org_created"
    )
    # Duplicate check: org + table_id + created_at
    await _safe_index(
        d.orders,
        [("organization_id", 1), ("table_id", 1), ("created_at", -1)],
        "idx_orders_org_table_created"
    )
    # Credit orders
    await _safe_index(
        d.orders,
        [("organization_id", 1), ("is_credit", 1), ("balance_amount", 1)],
        "idx_orders_org_credit_balance",
        sparse=True
    )
    # Invoice number
    await _safe_index(
        d.orders,
        [("invoice_number", 1)],
        "idx_orders_invoice_number",
        sparse=True
    )

    # ── CUSTOMERS ────────────────────────────────────────────────────────────────
    await _safe_index(d.customers, [("organization_id", 1), ("phone", 1)], "idx_customers_org_phone", unique=True)
    await _safe_index(d.customers, [("organization_id", 1), ("created_at", -1)], "idx_customers_org_created")

    # ── MENU ITEMS ────────────────────────────────────────────────────────────
    await _safe_index(d.menu_items, [("organization_id", 1)], "idx_menu_org")
    await _safe_index(
        d.menu_items,
        [("organization_id", 1), ("available", 1)],
        "idx_menu_org_available"
    )
    await _safe_index(
        d.menu_items,
        [("id", 1), ("organization_id", 1)],
        "idx_menu_id_org"
    )

    # ── TABLES ────────────────────────────────────────────────────────────────
    await _safe_index(d.tables, [("organization_id", 1)], "idx_tables_org")
    await _safe_index(
        d.tables,
        [("id", 1), ("organization_id", 1)],
        "idx_tables_id_org"
    )
    await _safe_index(
        d.tables,
        [("organization_id", 1), ("table_number", 1)],
        "idx_tables_org_number"
    )

    # ── INVENTORY ─────────────────────────────────────────────────────────────
    await _safe_index(d.inventory, [("organization_id", 1)], "idx_inventory_org")
    await _safe_index(
        d.inventory,
        [("id", 1), ("organization_id", 1)],
        "idx_inventory_id_org"
    )

    print("✅ Database indexes verified")
