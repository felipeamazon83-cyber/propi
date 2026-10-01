import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Business(Base):
    __tablename__ = "businesses"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    owner_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(160),
        nullable=False,
    )

    legal_name: Mapped[str | None] = mapped_column(
        String(160),
        nullable=True,
    )

    logo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    country: Mapped[str] = mapped_column(
        String(2),
        default="ES",
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        default="EUR",
        nullable=False,
    )

    stripe_account_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    subscription_status: Mapped[str] = mapped_column(
        String(32),
        default="trialing",
        nullable=False,
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("public.businesses.id"),
        index=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    photo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class Location(Base):
    __tablename__ = "locations"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("public.businesses.id"),
        index=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    type: Mapped[str] = mapped_column(
        String(32),
        default="table",
        nullable=False,
    )

    public_token: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    distribution_mode: Mapped[str] = mapped_column(
        String(16),
        default="employee",
        nullable=False,
    )

    fixed_employee_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("public.employees.id"),
        nullable=True,
    )

    employee_percentage: Mapped[float] = mapped_column(
        Numeric(5, 2),
        default=100,
        nullable=False,
    )

    suggested_amounts: Mapped[list] = mapped_column(
        JSONB,
        default=lambda: [1, 2, 3, 5],
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )


class Tip(Base):
    __tablename__ = "tips"
    __table_args__ = (
        UniqueConstraint("stripe_checkout_session_id"),
        {"schema": "public"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("public.businesses.id"),
        index=True,
        nullable=False,
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("public.employees.id"),
        nullable=False,
    )

    location_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("public.locations.id"),
        nullable=False,
    )

    amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    platform_fixed_fee: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False,
    )

    platform_percentage_fee: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False,
    )

    customer_total: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False,
    )

    connected_account_payout: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False,
    )

    stripe_transfer_id: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
    )

    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(16),
        default="pending",
        nullable=False,
    )

    stripe_payment_intent_id: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
    )

    stripe_checkout_session_id: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )


class TipSetting(Base):
    __tablename__ = "tip_settings"
    __table_args__ = {"schema": "public"}

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    business_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("public.businesses.id"),
        unique=True,
        nullable=False,
    )

    suggested_amount_1: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=1,
        nullable=False,
    )

    suggested_amount_2: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=2,
        nullable=False,
    )

    suggested_amount_3: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=3,
        nullable=False,
    )

    allow_custom_amount: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    minimum_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=0.5,
        nullable=False,
    )

    maximum_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=100,
        nullable=False,
    )

    show_employee_photos: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    tip_distribution_mode: Mapped[str] = mapped_column(
        String(16),
        default="employee",
        nullable=False,
    )
