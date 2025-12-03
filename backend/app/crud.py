from sqlalchemy.orm import Session
from sqlalchemy import desc
from . import models, schemas
from .auth import get_password_hash


# User CRUD
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        poke_coins=100  # ⭐ НОВОЕ: начальные монеты при регистрации
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Создаем запись в лидерборде
    leaderboard_entry = models.Leaderboard(
        user_id=db_user.id,
        username=db_user.username
    )
    db.add(leaderboard_entry)
    db.commit()

    return db_user


# Game Session CRUD
def create_game_session(db: Session, session_data: schemas.GameResult, user_id: int):
    db_session = models.GameSession(
        user_id=user_id,
        score=session_data.score,
        poke_coins_earned=session_data.poke_coins_earned,  # ⭐ НОВОЕ: сохраняем заработанные монеты
        waves_completed=session_data.waves_completed,
        pokemons_caught=session_data.pokemons_caught,
        enemies_defeated=session_data.enemies_defeated,
        game_duration=session_data.game_duration,
        victory=session_data.victory
    )
    db.add(db_session)

    # ⭐ ВАЖНО: ОБНОВЛЯЕМ БАЛАНС ПОЛЬЗОВАТЕЛЯ
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.poke_coins += session_data.poke_coins_earned
        print(f"💰 User {user.username} earned {session_data.poke_coins_earned} coins. Total: {user.poke_coins}")

    db.commit()
    db.refresh(db_session)

    # Обновляем лидерборд
    leaderboard = db.query(models.Leaderboard).filter(models.Leaderboard.user_id == user_id).first()
    if leaderboard:
        if session_data.score > leaderboard.high_score:
            leaderboard.high_score = session_data.score
        leaderboard.total_waves += session_data.waves_completed
        leaderboard.total_pokemons += session_data.pokemons_caught
        leaderboard.total_enemies += session_data.enemies_defeated
        db.commit()

    return db_session


# Leaderboard CRUD
def get_leaderboard(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Leaderboard) \
        .order_by(desc(models.Leaderboard.high_score)) \
        .offset(skip) \
        .limit(limit) \
        .all()


def get_user_stats(db: Session, user_id: int):
    user_stats = db.query(models.Leaderboard).filter(models.Leaderboard.user_id == user_id).first()

    # Получаем последние игры пользователя
    recent_games = db.query(models.GameSession) \
        .filter(models.GameSession.user_id == user_id) \
        .order_by(desc(models.GameSession.created_at)) \
        .limit(10) \
        .all()

    # ⭐ НОВОЕ: получаем монеты пользователя
    user = db.query(models.User).filter(models.User.id == user_id).first()

    return {
        "leaderboard": user_stats,
        "recent_games": recent_games,
        "poke_coins": user.poke_coins if user else 0  # ⭐ НОВОЕ: возвращаем монеты
    }