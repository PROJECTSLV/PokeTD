from .auth import router as auth_router
from .users import router as users_router
from .game import router as game_router
from .leaderboard import router as leaderboard_router

__all__ = ["auth_router", "users_router", "game_router", "leaderboard_router"]