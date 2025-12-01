from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List, Dict, Any


# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# Game schemas
class PokemonData(BaseModel):
    id: int
    name: str
    element: str
    health: int
    attack: int
    sprite_url: str


class GameState(BaseModel):
    player_health: int
    player_level: int
    player_exp: int
    player_max_exp: int
    pokeballs: int
    hand: List[PokemonData]
    field: List[Dict[str, Any]]  # Покемоны на поле
    enemies: List[Dict[str, Any]]  # Враги на поле
    wave: int
    score: int


class GameAction(BaseModel):
    action_type: str  # "open_pokeball", "play_card", "end_turn"
    data: Optional[Dict[str, Any]] = None


class GameResult(BaseModel):
    victory: bool
    score: int
    waves_completed: int
    pokemons_caught: int
    enemies_defeated: int
    game_duration: float


# Leaderboard schemas
class LeaderboardEntry(BaseModel):
    username: str
    high_score: int
    total_waves: int
    rank: Optional[int] = None

    class Config:
        from_attributes = True
