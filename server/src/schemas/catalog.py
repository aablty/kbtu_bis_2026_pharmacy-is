from decimal import Decimal

from pydantic import BaseModel, Field


class SupplierCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    contact_phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=150)


class SupplierUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    contact_phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=150)


class SupplierResponse(BaseModel):
    supplier_id: int
    name: str
    contact_phone: str | None
    address: str | None

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    parent_id: int | None = None


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    parent_id: int | None = Field(default=None, description="Pass null to move to root")


class CategoryResponse(BaseModel):
    category_id: int
    name: str
    slug: str
    parent_id: int | None

    model_config = {"from_attributes": True}


class MedicineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    manufacturer: str | None = Field(default=None, max_length=150)
    dosage_form: str | None = Field(default=None, max_length=50)
    price: Decimal = Field(gt=0, decimal_places=2)
    requires_prescription: bool = False
    stock_quantity: int = Field(default=0, ge=0)
    reorder_threshold: int = Field(default=0, ge=0)
    category_id: int
    supplier_id: int


class MedicineUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    manufacturer: str | None = Field(default=None, max_length=150)
    dosage_form: str | None = Field(default=None, max_length=50)
    price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    requires_prescription: bool | None = None
    stock_quantity: int | None = Field(default=None, ge=0)
    reorder_threshold: int | None = Field(default=None, ge=0)
    category_id: int | None = None
    supplier_id: int | None = None


class MedicineResponse(BaseModel):
    medicine_id: int
    name: str
    manufacturer: str | None
    dosage_form: str | None
    price: Decimal
    requires_prescription: bool
    stock_quantity: int
    reorder_threshold: int
    category_id: int
    supplier_id: int

    model_config = {"from_attributes": True}


class MedicineListResponse(BaseModel):
    items: list[MedicineResponse]
    total: int
    limit: int
    offset: int
