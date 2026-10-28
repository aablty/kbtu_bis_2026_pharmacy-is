from fastapi import APIRouter

from src.routers.deps import CurrentUser
from src.schemas.auth import UserProfile

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfile)
async def get_my_profile(current_user: CurrentUser) -> UserProfile:
    return UserProfile.model_validate(current_user)
