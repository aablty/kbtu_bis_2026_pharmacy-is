from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from src.core.exceptions import InvalidCurrentPasswordError, PasswordNotSetError
from src.routers.deps import CurrentUser, get_auth_service
from src.schemas.auth import (
    MessageResponse,
    PasswordChangeRequest,
    UserProfile,
    UserUpdate,
)
from src.services.auth_service import AuthService

router = APIRouter(prefix="/users", tags=["users"])

AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


@router.get("/me", response_model=UserProfile)
async def get_my_profile(current_user: CurrentUser) -> UserProfile:
    return UserProfile.model_validate(current_user)


@router.patch("/me", response_model=UserProfile)
async def update_my_profile(
    payload: UserUpdate, current_user: CurrentUser, auth_service: AuthServiceDep
) -> UserProfile:
    user = await auth_service.update_profile(
        current_user, payload.model_dump(exclude_unset=True)
    )
    return UserProfile.model_validate(user)


@router.post("/me/password", response_model=MessageResponse)
async def change_my_password(
    payload: PasswordChangeRequest,
    current_user: CurrentUser,
    auth_service: AuthServiceDep,
) -> MessageResponse:
    try:
        await auth_service.change_password(
            current_user, payload.current_password, payload.new_password
        )
    except InvalidCurrentPasswordError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Current password is incorrect"
        ) from None
    except PasswordNotSetError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This account has no password yet - set one with forgot password",
        ) from None
    return MessageResponse(message="Password changed")
