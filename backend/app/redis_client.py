import redis.asyncio as redis
from .config import settings
import json


class RedisClient:
    def __init__(self):
        self.redis = None

    async def connect(self):
        self.redis = await redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )

    async def disconnect(self):
        if self.redis:
            await self.redis.close()

    async def ping(self):
        return await self.redis.ping()

    async def set_game(self, user_id: int, game_data: dict):
        key = f"game:{user_id}"
        await self.redis.setex(
            key,
            3600,  # TTL 1 час
            json.dumps(game_data)
        )

    async def get_game(self, user_id: int) -> dict:
        key = f"game:{user_id}"
        data = await self.redis.get(key)
        return json.loads(data) if data else None

    async def delete_game(self, user_id: int):
        key = f"game:{user_id}"
        await self.redis.delete(key)

    async def set_leaderboard_cache(self, data: dict):
        await self.redis.setex(
            "leaderboard:cache",
            300,  # 5 минут кэша
            json.dumps(data)
        )

    async def get_leaderboard_cache(self) -> dict:
        data = await self.redis.get("leaderboard:cache")
        return json.loads(data) if data else None


# Создаем глобальный экземпляр
redis_client = RedisClient()