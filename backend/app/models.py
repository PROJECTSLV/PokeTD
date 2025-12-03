from sqlalchemy import Boolean, Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    poke_coins = Column(Integer, default=100)  # ⭐ НОВОЕ: начальные монеты
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    # Связи
    game_sessions = relationship("GameSession", back_populates="user")
    owned_pokemons = relationship("UserPokemon", back_populates="user")


class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    score = Column(Integer, default=0)
    poke_coins_earned = Column(Integer, default=0)  # ⭐ НОВОЕ: заработанные монеты за игру
    waves_completed = Column(Integer, default=0)
    pokemons_caught = Column(Integer, default=0)
    enemies_defeated = Column(Integer, default=0)
    game_duration = Column(Float, default=0.0)  # в секундах
    victory = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Связи
    user = relationship("User", back_populates="game_sessions")


class UserPokemon(Base):
    __tablename__ = "user_pokemons"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    pokemon_id = Column(Integer)  # ID покемона из PokeAPI или локальной БД
    name = Column(String(50))
    element = Column(String(20))  # Тип покемона (fire, water, grass и т.д.)
    base_health = Column(Integer)
    base_attack = Column(Integer)
    level = Column(Integer, default=1)
    experience = Column(Integer, default=0)
    is_favorite = Column(Boolean, default=False)
    caught_at = Column(DateTime(timezone=True), server_default=func.now())

    # Связи
    user = relationship("User", back_populates="owned_pokemons")


class Leaderboard(Base):
    __tablename__ = "leaderboard"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    username = Column(String(50))
    high_score = Column(Integer, default=0)
    total_waves = Column(Integer, default=0)
    total_pokemons = Column(Integer, default=0)
    total_enemies = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Связи
    user = relationship("User")