from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from src.core.exceptions import (
    FileTooLargeError,
    InvalidFileTypeError,
    PrescriptionAlreadyReviewedError,
    PrescriptionNotFoundError,
)
from src.models.enums import UserRole
from src.models.prescription import Prescription
from src.models.user import User
from src.routers.deps import CurrentUser, get_prescription_service, require_role
from src.schemas.prescriptions import PrescriptionResponse, PrescriptionReviewRequest
from src.services.prescription_service import MAX_FILE_SIZE_BYTES, PrescriptionService

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

PrescriptionServiceDep = Annotated[
    PrescriptionService, Depends(get_prescription_service)
]
_REVIEWER_ROLES = (UserRole.ADMIN, UserRole.PHARMACIST)
_STAFF_ROLES = (UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER)


def _to_response(
    prescription: Prescription, customer: User | None = None
) -> PrescriptionResponse:
    response = PrescriptionResponse.model_validate(prescription)
    if customer is not None:
        response = response.model_copy(
            update={
                "customer_name": customer.full_name,
                "customer_email": customer.email,
            }
        )
    return response


@router.post(
    "",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.CUSTOMER))],
)
async def upload_prescription(
    current_user: CurrentUser,
    service: PrescriptionServiceDep,
    file: Annotated[UploadFile, File()],
) -> PrescriptionResponse:
    # Read at most one byte over the limit - rejecting an oversized upload
    # shouldn't require buffering the whole thing in memory first.
    content = await file.read(MAX_FILE_SIZE_BYTES + 1)
    try:
        prescription = await service.upload(
            current_user.user_id,
            file.filename or "prescription",
            file.content_type or "application/octet-stream",
            content,
        )
    except InvalidFileTypeError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Unsupported file type - use JPEG, PNG, or PDF"
        ) from None
    except FileTooLargeError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "File too large - max 10MB"
        ) from None
    return _to_response(prescription, current_user)


@router.get("", response_model=list[PrescriptionResponse])
async def list_prescriptions(
    current_user: CurrentUser, service: PrescriptionServiceDep
) -> list[PrescriptionResponse]:
    """Customers see only their own prescriptions; staff see every submission -
    pharmacists need the full queue to review."""
    prescriptions = (
        await service.list_all()
        if current_user.role in _STAFF_ROLES
        else await service.list_for_customer(current_user.user_id)
    )
    customers_by_id = await service.get_customers(
        list({p.customer_id for p in prescriptions})
    )
    return [_to_response(p, customers_by_id.get(p.customer_id)) for p in prescriptions]


@router.get("/{prescription_id}", response_model=PrescriptionResponse)
async def get_prescription(
    prescription_id: int, current_user: CurrentUser, service: PrescriptionServiceDep
) -> PrescriptionResponse:
    try:
        prescription = await service.get(prescription_id)
    except PrescriptionNotFoundError:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Prescription not found"
        ) from None

    is_owner = prescription.customer_id == current_user.user_id
    if not is_owner and current_user.role not in _STAFF_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your prescription")

    customer = (
        current_user
        if is_owner
        else (await service.get_customers([prescription.customer_id])).get(
            prescription.customer_id
        )
    )
    return _to_response(prescription, customer)


@router.patch(
    "/{prescription_id}/review",
    response_model=PrescriptionResponse,
    dependencies=[Depends(require_role(*_REVIEWER_ROLES))],
)
async def review_prescription(
    prescription_id: int,
    payload: PrescriptionReviewRequest,
    current_user: CurrentUser,
    service: PrescriptionServiceDep,
) -> PrescriptionResponse:
    try:
        prescription = await service.review(
            prescription_id, current_user.user_id, payload.approve, payload.reason
        )
    except PrescriptionNotFoundError:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Prescription not found"
        ) from None
    except PrescriptionAlreadyReviewedError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Prescription was already reviewed"
        ) from None
    customer = (await service.get_customers([prescription.customer_id])).get(
        prescription.customer_id
    )
    return _to_response(prescription, customer)
