from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# Импорты из текущего пакета
from .. import schemas, crud
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(
        current_user: schemas.UserResponse = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    # ⭐ НОВОЕ: получаем актуальные монеты из БД
    user = crud.get_user(db, current_user.id)
    if user:
        # Обновляем объект текущего пользователя
        current_user.poke_coins = user.poke_coins
    return current_user


@router.get("/coins")
def get_user_coins(
        current_user: schemas.UserResponse = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Получение баланса монет пользователя"""
    user = crud.get_user(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"poke_coins": user.poke_coins}


@router.put("/me")
def update_user_profile(
        user_update: schemas.UserBase,
        current_user: schemas.UserResponse = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    # Реализация обновления профиля
    return {"message": "Profile update not implemented yet"}