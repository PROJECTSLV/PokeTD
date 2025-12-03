from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

# Импорты из текущего пакета
from .. import schemas, crud
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/api/v1/leaderboard", tags=["leaderboard"])


@router.get("/", response_model=List[schemas.LeaderboardEntry])
def get_leaderboard(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=1000),
        db: Session = Depends(get_db)
):
    """Получение лидерборда"""
    leaderboard = crud.get_leaderboard(db, skip=skip, limit=limit)

    # Добавляем ранги
    result = []
    for i, entry in enumerate(leaderboard, start=skip + 1):
        entry_data = {
            "username": entry.username,
            "high_score": entry.high_score,
            "total_waves": entry.total_waves,
            "rank": i
        }
        result.append(schemas.LeaderboardEntry(**entry_data))

    return result


@router.get("/my-stats")
def get_my_stats(
        current_user: schemas.UserResponse = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Получение статистики текущего пользователя"""
    return crud.get_user_stats(db, current_user.id)