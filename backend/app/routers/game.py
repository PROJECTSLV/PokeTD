from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas, crud, game_logic
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/api/v1/game", tags=["game"])

# ⭐ ВАЖНО: храним активные игры в памяти
active_games = {}


@router.post("/start")
def start_game(
        current_user: schemas.UserResponse = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Начало новой игры"""
    # Завершаем старую игру, если есть
    if current_user.id in active_games:
        try:
            # Сохраняем результат старой игры
            game = active_games[current_user.id]
            result = game.get_game_result()
            game_result = schemas.GameResult(**result)
            crud.create_game_session(db, game_result, current_user.id)
            del active_games[current_user.id]
        except Exception as e:
            print(f"⚠️ Error ending previous game: {e}")

    # Создаем новую игру
    game = game_logic.PokemonGameLogic(current_user.id)
    active_games[current_user.id] = game

    # Сразу обновляем состояние, чтобы появились враги
    game.update(0)

    return {"message": "Game started", "game_id": current_user.id}


@router.post("/action")
def game_action(
        action: schemas.GameAction,
        current_user: schemas.UserResponse = Depends(get_current_user)
):
    """Выполнение действия в игре"""
    if current_user.id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = active_games[current_user.id]

    # ⭐ ВАЖНО: проверяем, не закончилась ли игра
    if game.game_over:
        return {"error": "Game is already over"}

    if action.action_type == "open_pokeball":
        result = game.open_pokeball()
    elif action.action_type == "play_card":
        if not action.data:
            raise HTTPException(status_code=400, detail="Missing card data")
        # ⭐ ИЗМЕНЕНИЕ: передаем только X координату
        result = game.play_card(
            card_id=action.data.get("card_id"),
            x=action.data.get("x")
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
    if current_user.id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = active_games[current_user.id]

    # Обновляем состояние игры перед возвратом
    state = game.update(0.1)  # небольшое обновление

    return state


@router.post("/update")
def update_game(
        delta_time: float = 0.016,  # 60 FPS по умолчанию
        current_user: schemas.UserResponse = Depends(get_current_user)
):
    """Обновление игрового состояния (для автоматических обновлений)"""
    if current_user.id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = active_games[current_user.id]
    state = game.update(delta_time)

    return state


@router.post("/end")
def end_game(
        current_user: schemas.UserResponse = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Завершение игры и сохранение результата"""
    if current_user.id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    try:
        game = active_games[current_user.id]
        result = game.get_game_result()

        # ⭐ ВАЖНО: ВСЕГДА сохраняем результат
        game_result = schemas.GameResult(**result)
        saved_session = crud.create_game_session(db, game_result, current_user.id)

        print(f"🎮 Game ended for user {current_user.id}. Coins earned: {result['poke_coins_earned']}")

        # Удаляем игру из активных
        del active_games[current_user.id]

        return {
            **result,
            "session_id": saved_session.id,
            "message": "Game saved successfully"
        }

    except Exception as e:
        print(f"❌ Error saving game result: {e}")
        # ⭐ ВАЖНО: даже при ошибке удаляем игру из памяти
        if current_user.id in active_games:
            del active_games[current_user.id]
        raise HTTPException(status_code=500, detail=f"Failed to save game result: {str(e)}")