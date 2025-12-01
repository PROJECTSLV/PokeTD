from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# Импорты из текущего пакета
from .. import schemas, crud
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: schemas.UserResponse = Depends(get_current_user)):
    return current_user


@router.put("/me")
def update_user_profile(
    user_update: schemas.UserBase,
    current_user: schemas.UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Реализация обновления профиля
    return {"message": "Profile update not implemented yet"}