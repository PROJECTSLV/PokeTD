// Игровой клиент - только одно объявление класса
class GameClient {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = null;
        this.isRunning = true;
        this.lastTime = 0;
        this.selectedCard = null;
        this.animationId = null;

        // Установите размеры канваса
        this.canvas.width = 800;
        this.canvas.height = 600;

        this.setupEventListeners();
        this.startGameLoop();
        this.loadGameState();

        // Обновляем состояние каждую секунду
        this.updateInterval = setInterval(() => {
            if (this.isRunning) {
                this.loadGameState();
            }
        }, 1000);
    }

    setupEventListeners() {
        // Кнопка открытия покебола
        const openPokeballBtn = document.getElementById('openPokeballBtn');
        if (openPokeballBtn) {
            openPokeballBtn.addEventListener('click', () => this.openPokeball());
        }

        // Кнопка паузы
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }

        // Кнопка сдачи
        const quitBtn = document.getElementById('quitBtn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => this.quitGame());
        }

        // Кнопки модального окна
        const playAgainBtn = document.getElementById('playAgainBtn');
        const returnToLobbyBtn = document.getElementById('returnToLobbyBtn');

        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => this.playAgain());
        }

        if (returnToLobbyBtn) {
            returnToLobbyBtn.addEventListener('click', () => {
                clearInterval(this.updateInterval);
                window.location.href = '/lobby';
            });
        }

        // Обработка кликов по канвасу
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Клики по картам
        this.setupCardSelection();
    }

    setupCardSelection() {
        // Делегирование событий для динамически созданных карт
        document.addEventListener('click', (e) => {
            if (e.target.closest('.pokemon-card')) {
                const card = e.target.closest('.pokemon-card');
                this.selectCard(card);
            }
        });
    }

    selectCard(card) {
        // Убираем выделение с других карт
        document.querySelectorAll('.pokemon-card').forEach(c => {
            c.style.border = '2px solid #ddd';
            c.style.boxShadow = 'none';
        });

        // Выделяем текущую карту
        card.style.border = '2px solid #ff0000';
        card.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';

        this.selectedCard = {
            id: parseInt(card.dataset.cardId),
            element: card
        };

        showNotification('Card selected. Now click on the field to place it.', 'info');
    }

    handleCanvasClick(e) {
        if (!this.selectedCard) {
            showNotification('Select a card first by clicking on it', 'info');
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        console.log('Placing card at:', x, y);
        this.playCard(this.selectedCard.id, x, y);
    }

    async loadGameState() {
        try {
            const state = await ApiClient.get('/game/state');
            if (state) {
                this.gameState = state;
                this.updateUI();

                // Если игра окончена, показываем модальное окно
                if (state.game_over) {
                    this.showEndGameModal(state.victory);
                }
            }
        } catch (error) {
            console.error('Failed to load game state:', error);
            // Не показываем уведомление для обычных ошибок соединения
        }
    }

    async openPokeball() {
        if (!this.gameState || this.gameState.pokeballs <= 0) {
            showNotification('No pokeballs left!', 'error');
            return;
        }

        try {
            const result = await ApiClient.post('/game/action', {
                action_type: 'open_pokeball'
            });

            if (result.success) {
                showNotification(`Got ${result.pokemon.name}!`, 'success');
                await this.loadGameState();
            } else {
                showNotification(result.error || 'Failed to open pokeball', 'error');
            }
        } catch (error) {
            console.error('Failed to open pokeball:', error);
            showNotification('Failed to open pokeball', 'error');
        }
    }

    async playCard(cardId, x, y) {
        try {
            const result = await ApiClient.post('/game/action', {
                action_type: 'play_card',
                data: {
                    card_id: cardId,
                    x: Math.round(x),
                    y: Math.round(y)
                }
            });

            if (result.success) {
                showNotification('Pokemon placed on field!', 'success');
                await this.loadGameState();

                // Снимаем выделение с карты
                if (this.selectedCard && this.selectedCard.element) {
                    this.selectedCard.element.style.border = '2px solid #ddd';
                    this.selectedCard.element.style.boxShadow = 'none';
                }
                this.selectedCard = null;
            } else {
                showNotification(result.error || 'Cannot place here', 'error');
            }
        } catch (error) {
            console.error('Failed to play card:', error);
            showNotification('Failed to place pokemon', 'error');
        }
    }

    togglePause() {
        this.isRunning = !this.isRunning;
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.textContent = this.isRunning ? 'Pause' : 'Resume';
        }

        if (this.isRunning) {
            this.startGameLoop();
        } else {
            cancelAnimationFrame(this.animationId);
        }
    }

    async quitGame() {
        if (confirm('Are you sure you want to quit?')) {
            try {
                clearInterval(this.updateInterval);
                await ApiClient.post('/game/end', {});
                window.location.href = '/lobby';
            } catch (error) {
                console.error('Failed to quit game:', error);
                showNotification('Failed to quit game', 'error');
            }
        }
    }

    playAgain() {
        const modal = document.getElementById('endGameModal');
        if (modal) {
            modal.classList.remove('active');
        }

        // Начинаем новую игру
        ApiClient.post('/game/start', {})
            .then(() => {
                this.loadGameState();
                this.isRunning = true;
                this.startGameLoop();
            })
            .catch(error => {
                console.error('Failed to restart game:', error);
                showNotification('Failed to restart game', 'error');
            });
    }

    startGameLoop() {
        const gameLoop = (timestamp) => {
            if (!this.lastTime) this.lastTime = timestamp;
            const deltaTime = timestamp - this.lastTime;
            this.lastTime = timestamp;

            if (this.isRunning) {
                this.render();
            }

            this.animationId = requestAnimationFrame(gameLoop);
        };

        this.animationId = requestAnimationFrame(gameLoop);
    }

    render() {
        // Очищаем канвас
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем фон
        this.drawBackground();

        // Рисуем игровые элементы
        if (this.gameState) {
            this.drawFieldElements();
            this.drawEnemies();
        }
    }

    drawBackground() {
        // Градиентный фон неба
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E0F7FF');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Земля (нижняя часть)
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 100);

        // Трава
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 20);

        // Верхняя целевая линия (где спавнятся враги)
        this.ctx.strokeStyle = '#FF0000';
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 100);
        this.ctx.lineTo(this.canvas.width, 100);
        this.ctx.stroke();

        // Нижняя линия защиты игрока
        this.ctx.strokeStyle = '#0000FF';
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height - 150);
        this.ctx.lineTo(this.canvas.width, this.canvas.height - 150);
        this.ctx.stroke();

        // Сетка для размещения покемонов (игровая зона)
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;

        for (let x = 50; x < this.canvas.width; x += 100) {
            for (let y = 200; y < this.canvas.height - 200; y += 100) {
                this.ctx.strokeRect(x - 40, y - 40, 80, 80);
                this.ctx.fillStyle = 'rgba(0, 255, 0, 0.05)';
                this.ctx.fillRect(x - 40, y - 40, 80, 80);
            }
        }

        // Надписи
        this.ctx.fillStyle = '#FF0000';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ENEMY SPAWN', this.canvas.width / 2, 80);

        this.ctx.fillStyle = '#0000FF';
        this.ctx.fillText('YOUR BASE', this.canvas.width / 2, this.canvas.height - 130);

        this.ctx.fillStyle = '#333';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Place your Pokemon here', this.canvas.width / 2, this.canvas.height / 2);
    }

    drawFieldElements() {
        if (!this.gameState.field) return;

        this.gameState.field.forEach(pokemon => {
            const x = pokemon.x || 100;
            const y = pokemon.y || 200;
            const healthPercent = (pokemon.current_health || pokemon.health) / pokemon.health;

            // Круг покемона
            this.ctx.fillStyle = this.getElementColor(pokemon.element);
            this.ctx.beginPath();
            this.ctx.arc(x, y, 25, 0, Math.PI * 2);
            this.ctx.fill();

            // Обводка
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Иконка типа
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.getElementIcon(pokemon.element), x, y + 8);

            // Имя покемона
            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.fillText(pokemon.name.substring(0, 8), x, y + 40);

            // Полоска здоровья
            this.ctx.fillStyle = '#dc3545';
            this.ctx.fillRect(x - 30, y - 40, 60, 6);

            this.ctx.fillStyle = '#28a745';
            this.ctx.fillRect(x - 30, y - 40, 60 * healthPercent, 6);

            // Обводка полоски здоровья
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x - 30, y - 40, 60, 6);
        });
    }

    drawEnemies() {
        if (!this.gameState.enemies) return;

        this.gameState.enemies.forEach(enemy => {
            const x = enemy.x || Math.random() * 700 + 50;
            const y = enemy.y || 100;
            const healthPercent = (enemy.current_health || enemy.health) / enemy.health;

            // Круг врага
            this.ctx.fillStyle = '#dc3545';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 20, 0, Math.PI * 2);
            this.ctx.fill();

            // Обводка
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Иконка врага
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('👾', x, y + 6);

            // Имя врага
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px Arial';
            this.ctx.fillText(enemy.name.substring(0, 6), x, y + 30);

            // Полоска здоровья врага
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.fillRect(x - 25, y - 35, 50, 5);

            this.ctx.fillStyle = '#ffc107';
            this.ctx.fillRect(x - 25, y - 35, 50 * healthPercent, 5);

            // Обводка полоски здоровья
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x - 25, y - 35, 50, 5);

            // Стрелка направления движения (вниз)
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + 35);
            this.ctx.lineTo(x - 5, y + 25);
            this.ctx.lineTo(x + 5, y + 25);
            this.ctx.closePath();
            this.ctx.fill();
        });
    }

    getElementColor(element) {
        const colors = {
            'fire': '#FF4500',
            'water': '#1E90FF',
            'grass': '#32CD32',
            'electric': '#FFD700',
            'normal': '#A9A9A9',
            'poison': '#9400D3',
            'flying': '#87CEEB'
        };
        return colors[element] || '#808080';
    }

    getElementIcon(element) {
        const icons = {
            'fire': '🔥',
            'water': '💧',
            'grass': '🌿',
            'electric': '⚡',
            'normal': '⚪',
            'poison': '☠️',
            'flying': '🕊️'
        };
        return icons[element] || '⚫';
    }

    updateUI() {
        if (!this.gameState) return;

        // Обновляем здоровье
        const healthBar = document.getElementById('playerHealth');
        const healthValue = document.getElementById('healthValue');
        if (healthBar && healthValue) {
            const healthPercent = Math.max(0, this.gameState.player_health) / 100;
            healthBar.style.width = `${healthPercent * 100}%`;
            healthValue.textContent = this.gameState.player_health;

            // Меняем цвет в зависимости от здоровья
            if (healthPercent < 0.3) {
                healthBar.style.background = 'linear-gradient(90deg, #dc3545 0%, #ff6b6b 100%)';
            } else if (healthPercent < 0.6) {
                healthBar.style.background = 'linear-gradient(90deg, #ffc107 0%, #ffd166 100%)';
            } else {
                healthBar.style.background = 'linear-gradient(90deg, #28a745 0%, #7cfc00 100%)';
            }
        }

        // Обновляем уровень и опыт
        document.getElementById('playerLevel').textContent = this.gameState.player_level || 1;
        document.getElementById('playerExp').textContent = this.gameState.player_exp || 0;
        document.getElementById('playerMaxExp').textContent = this.gameState.player_max_exp || 100;

        // Обновляем счет и волну
        document.getElementById('currentWave').textContent = this.gameState.wave || 1;
        document.getElementById('score').textContent = this.gameState.score || 0;

        // Обновляем количество покеболов
        const pokeballCount = document.getElementById('pokeballCount');
        const pokeballsLeft = document.getElementById('pokeballsLeft');
        const openPokeballBtn = document.getElementById('openPokeballBtn');

        if (pokeballCount) pokeballCount.textContent = this.gameState.pokeballs || 0;
        if (pokeballsLeft) pokeballsLeft.textContent = this.gameState.pokeballs || 0;
        if (openPokeballBtn) {
            openPokeballBtn.disabled = (this.gameState.pokeballs || 0) <= 0;
            openPokeballBtn.innerHTML = `🎯 Open Pokeball (Left: <span id="pokeballsLeft">${this.gameState.pokeballs || 0}</span>)`;
        }

        // Обновляем руку игрока
        this.updatePlayerHand();
    }

    updatePlayerHand() {
        const handContainer = document.getElementById('handContainer');
        if (!handContainer || !this.gameState.hand) return;

        if (this.gameState.hand.length === 0) {
            handContainer.innerHTML = `
                <div style="text-align: center; width: 100%; padding: 40px; color: #666;">
                    No cards in hand. Open a pokeball to get your first Pokemon!
                </div>
            `;
            return;
        }

        handContainer.innerHTML = this.gameState.hand.map(pokemon => `
            <div class="pokemon-card" data-card-id="${pokemon.id}">
                <div class="card-header">${pokemon.name}</div>
                <div class="card-icon">${this.getElementIcon(pokemon.element)}</div>
                <div class="card-stats">
                    <div>❤️ ${pokemon.health} HP</div>
                    <div>⚔️ ${pokemon.attack} ATK</div>
                </div>
                <div class="card-element">${pokemon.element}</div>
                <div class="card-hint">Click to select</div>
            </div>
        `).join('');

        // Добавляем стили для иконок
        if (!document.querySelector('#card-styles')) {
            const style = document.createElement('style');
            style.id = 'card-styles';
            style.textContent = `
                .card-icon {
                    font-size: 32px;
                    text-align: center;
                    margin: 5px 0;
                }
                .card-hint {
                    font-size: 10px;
                    color: #666;
                    margin-top: 5px;
                    text-align: center;
                    font-style: italic;
                }
            `;
            document.head.appendChild(style);
        }
    }

    showEndGameModal(victory) {
        const modal = document.getElementById('endGameModal');
        const title = document.getElementById('gameResultTitle');

        if (modal && title) {
            title.textContent = victory ? '🎉 Victory! 🎉' : '💀 Game Over 💀';
            title.style.color = victory ? '#28a745' : '#dc3545';

            // Обновляем статистику
            document.getElementById('finalScore').textContent = this.gameState.score || 0;
            document.getElementById('finalWaves').textContent = (this.gameState.wave || 1) - 1;
            document.getElementById('finalEnemies').textContent = Math.floor((this.gameState.score || 0) / 10);

            modal.classList.add('active');
            this.isRunning = false;

            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }

            clearInterval(this.updateInterval);
        }
    }
}

// Инициализация игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) {
        window.location.href = '/login';
        return;
    }

    // Инициализируем игру
    window.gameClient = new GameClient();
});