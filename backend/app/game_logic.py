import random
from typing import List, Dict, Any
from datetime import datetime


class PokemonGameLogic:
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.start_time = datetime.now()
        self.reset_game()

    def reset_game(self):
        """Сброс состояния игры к начальным значениям"""
        self.player_health = 100
        self.player_level = 1
        self.player_exp = 0
        self.player_max_exp = 100
        self.pokeballs = 5
        self.score = 0
        self.wave = 1
        self.game_over = False
        self.victory = False

        # Колода и рука
        self.deck = self.generate_initial_deck()
        self.hand = []
        self.field = []
        self.enemies = []

        # Логика волн
        self.wave_data = self.generate_wave(self.wave)
        self.enemy_spawn_timer = 0
        self.enemy_spawn_interval = 2.0  # секунды

    def generate_initial_deck(self) -> List[Dict]:
        basic_pokemons = [
            {"id": 1, "name": "Charmander", "element": "fire", "health": 50, "attack": 10},
            {"id": 2, "name": "Squirtle", "element": "water", "health": 50, "attack": 10},
            {"id": 3, "name": "Bulbasaur", "element": "grass", "health": 50, "attack": 10},
        ]
        return random.sample(basic_pokemons, 2)

    def generate_wave(self, wave_number: int) -> List[Dict]:
        enemies = []
        base_count = min(3 + wave_number, 8)

        for i in range(base_count):
            enemy_types = [
                {"name": "Rattata", "element": "normal", "health": 20 + wave_number * 3, "attack": 5 + wave_number},
                {"name": "Spearow", "element": "flying", "health": 15 + wave_number * 3, "attack": 7 + wave_number},
                {"name": "Zubat", "element": "poison", "health": 25 + wave_number * 3, "attack": 8 + wave_number},
            ]
            enemy = random.choice(enemy_types)
            enemy["id"] = i
            enemies.append(enemy)

        return enemies

    def open_pokeball(self) -> Dict:
        if self.pokeballs <= 0:
            return {"error": "No pokeballs left"}

        self.pokeballs -= 1

        possible_pokemons = [
            {"name": "Pikachu", "element": "electric", "health": 40, "attack": 15},
            {"name": "Jigglypuff", "element": "normal", "health": 70, "attack": 8},
            {"name": "Meowth", "element": "normal", "health": 40, "attack": 12},
            {"name": "Psyduck", "element": "water", "health": 50, "attack": 10},
            {"name": "Growlithe", "element": "fire", "health": 55, "attack": 12},
        ]

        new_pokemon = random.choice(possible_pokemons)
        new_pokemon["id"] = len(self.hand) + len(self.field) + 100

        self.hand.append(new_pokemon)

        return {"success": True, "pokemon": new_pokemon}

    def play_card(self, card_id: int, x: int, y: int) -> Dict:
        card_index = next((i for i, card in enumerate(self.hand) if card["id"] == card_id), None)

        if card_index is None:
            return {"error": "Card not found in hand"}

        # Проверяем валидность позиции (игровая зона)
        if x < 0 or x > 800 or y < 200 or y > 400:
            return {"error": "Invalid position - must be within play area (y between 200-400)"}

        # Проверяем, не занята ли клетка
        for pokemon in self.field:
            if abs(pokemon["x"] - x) < 60 and abs(pokemon["y"] - y) < 60:
                return {"error": "Position already occupied"}

        card = self.hand.pop(card_index)
        field_pokemon = {
            **card,
            "x": x,
            "y": y,
            "current_health": card["health"],
            "attack_cooldown": 0
        }
        self.field.append(field_pokemon)

        return {"success": True, "field": self.field}

    def update(self, delta_time: float = 0.1) -> Dict:
        """Обновление игрового состояния. delta_time в секундах."""
        if self.game_over:
            return self.get_state()

        # Спавн врагов СВЕРХУ (случайная позиция по X)
        self.enemy_spawn_timer += delta_time
        if self.enemy_spawn_timer >= self.enemy_spawn_interval and self.wave_data:
            enemy_data = self.wave_data.pop(0)
            enemy = {
                **enemy_data,
                "x": random.randint(50, 750),  # Случайная позиция по X
                "y": 100,  # Фиксированная позиция сверху
                "current_health": enemy_data["health"],
                "speed": 20 + self.wave * 5  # Увеличиваем скорость с волнами
            }
            self.enemies.append(enemy)
            self.enemy_spawn_timer = 0

            if not self.wave_data:
                self.wave += 1
                self.wave_data = self.generate_wave(self.wave)

        # Движение врагов ВНИЗ к базе игрока
        for enemy in self.enemies[:]:
            # Цель: нижняя линия защиты игрока (y = 450)
            target_y = 450

            # Двигаемся вниз
            dy = target_y - enemy["y"]
            distance = abs(dy)

            if distance < enemy["speed"] * delta_time:
                enemy["y"] = target_y
                # Враг дошел до базы
                self.player_health -= 15
                self.enemies.remove(enemy)

                if self.player_health <= 0:
                    self.game_over = True
            else:
                # Продолжаем движение вниз
                enemy["y"] += enemy["speed"] * delta_time if dy > 0 else -enemy["speed"] * delta_time

        # Атаки покемонов
        for pokemon in self.field:
            pokemon["attack_cooldown"] = max(0, pokemon["attack_cooldown"] - delta_time)

            if pokemon["attack_cooldown"] <= 0:
                # Ищем ближайшего врага в радиусе атаки
                nearest_enemy = None
                nearest_distance = float('inf')

                for enemy in self.enemies:
                    distance = ((pokemon["x"] - enemy["x"]) ** 2 + (pokemon["y"] - enemy["y"]) ** 2) ** 0.5
                    if distance < 120 and distance < nearest_distance:  # Увеличили радиус атаки
                        nearest_enemy = enemy
                        nearest_distance = distance

                if nearest_enemy:
                    damage_multiplier = self.get_type_multiplier(pokemon["element"], nearest_enemy["element"])
                    damage = pokemon["attack"] * damage_multiplier

                    nearest_enemy["current_health"] -= damage

                    if nearest_enemy["current_health"] <= 0:
                        self.enemies.remove(nearest_enemy)
                        self.score += 10
                        self.player_exp += 1

                        if self.player_exp >= self.player_max_exp:
                            self.player_level += 1
                            self.pokeballs += 1
                            self.player_exp = 0
                            self.player_max_exp = int(self.player_max_exp * 1.2)

                    pokemon["attack_cooldown"] = 1.0  # КД атаки 1 секунда

        # Проверка победы (после 5 волн)
        if self.wave > 5:
            self.game_over = True
            self.victory = True

        return self.get_state()

    def get_type_multiplier(self, attacker: str, defender: str) -> float:
        effectiveness = {
            "fire": {"grass": 2.0, "water": 0.5},
            "water": {"fire": 2.0, "grass": 0.5},
            "grass": {"water": 2.0, "fire": 0.5},
            "electric": {"water": 2.0, "flying": 2.0},
            "flying": {"grass": 2.0},
            "poison": {"grass": 2.0},
        }
        return effectiveness.get(attacker, {}).get(defender, 1.0)

    def get_state(self) -> Dict:
        return {
            "player_health": self.player_health,
            "player_level": self.player_level,
            "player_exp": self.player_exp,
            "player_max_exp": self.player_max_exp,
            "pokeballs": self.pokeballs,
            "hand": self.hand,
            "field": self.field,
            "enemies": self.enemies,
            "wave": self.wave,
            "score": self.score,
            "game_over": self.game_over,
            "victory": self.victory
        }

    def get_game_result(self) -> Dict:
        game_duration = (datetime.now() - self.start_time).total_seconds()
        return {
            "victory": self.victory,
            "score": self.score,
            "waves_completed": self.wave - 1,
            "pokemons_caught": len(self.hand) + len(self.field),
            "enemies_defeated": self.score // 10,
            "game_duration": game_duration
        }


# Глобальный словарь для хранения активных игр
active_games = {}
