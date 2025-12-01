from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas, crud, game_logic
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/api/v1/game", tags=["game"])


@router.post("/start")
def start_game(
        current_user: schemas.UserResponse = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Начало новой игры"""
    # Завершаем старую игру, если есть
    if current_user.id in game_logic.active_games:
        del game_logic.active_games[current_user.id]

    # Создаем новую игру
    game = game_logic.PokemonGameLogic(current_user.id)
    game_logic.active_games[current_user.id] = game

    # Сразу обновляем состояние, чтобы появились враги
    game.update(0)

    return {"message": "Game started", "game_id": current_user.id}


@router.post("/action")
def game_action(
        action: schemas.GameAction,
        current_user: schemas.UserResponse = Depends(get_current_user)
):
    """Выполнение действия в игре"""
    if current_user.id not in game_logic.active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = game_logic.active_games[current_user.id]

    if action.action_type == "open_pokeball":
        result = game.open_pokeball()
    elif action.action_type == "play_card":
        if not action.data:
            raise HTTPException(status_code=400, detail="Missing card data")
        result = game.play_card(
            card_id=action.data.get("card_id"),
            x=action.data.get("x"),
            y=action.data.get("y")
        )
    else:
        raise HTTPException(status_code=400, detail="Unknown action type")

    # Обновляем состояние игры после действия
    game.update(0.1)

    return result


@router.get("/state")
def get_game_state(
        current_user: schemas.UserResponse = Depends(get_current_user)
):
    """Получение текущего состояния игры"""
    if current_user.id not in game_logic.active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = game_logic.active_games[current_user.id]

    # Обновляем состояние игры перед возвратом
    state = game.update(0.1)  # небольшое обновление

    return state


@router.post("/update")
def update_game(
        delta_time: float = 0.016,  # 60 FPS по умолчанию
        current_user: schemas.UserResponse = Depends(get_current_user)
):
    """Обновление игрового состояния (для автоматических обновлений)"""
    if current_user.id not in game_logic.active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = game_logic.active_games[current_user.id]
    state = game.update(delta_time)

    return state


@router.post("/end")
def end_game(
        current_user: schemas.UserResponse = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Завершение игры и сохранение результата"""
    if current_user.id not in game_logic.active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = game_logic.active_games[current_user.id]
    result = game.get_game_result()

    # Сохраняем результат
    game_result = schemas.GameResult(**result)
    crud.create_game_session(db, game_result, current_user.id)

    # Удаляем игру из активных
    del game_logic.active_games[current_user.id]

    return result