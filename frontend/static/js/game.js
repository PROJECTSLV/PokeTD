// Игровой клиент
class GameClient {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = null;
        this.isRunning = true;
        this.lastTime = 0;
        this.selectedCard = null;
        this.animationId = null;
        this.pendingPlacement = null;
        this.canvasScale = 1;
        this.canvasOffset = { x: 0, y: 0 };

        // Фоновая картинка
        this.backgroundImage = new Image();
        this.backgroundImage.src = '/static/images/backgrounds/battlefield.jpg'; // или другая картинка
        this.backgroundLoaded = false;

        this.backgroundImage.onload = () => {
            this.backgroundLoaded = true;
            console.log('Фоновая картинка загружена');
        };
        this.backgroundImage.onerror = () => {
            console.error('Ошибка загрузки фоновой картинки');
        };

        // Устанавливаем размеры канваса с учетом отступов
        this.setupCanvas();

        // Загрузка изображений
        this.images = {};
        this.imageCache = new Map();

        this.setupEventListeners();
        this.startGameLoop();
        this.loadGameState();
        this.loadImages();

        // Обновляем состояние каждую секунду
        this.updateInterval = setInterval(() => {
            if (this.isRunning) {
                this.loadGameState();
            }
        }, 1000);

        // Предварительная загрузка игрового состояния
        this.preloadGameState();

        // Обработка изменения размера окна
        window.addEventListener('resize', () => this.handleResize());
    }

    setupCanvas() {
        // Получаем размеры контейнера
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Сохраняем оригинальные пропорции 800x600 (4:3)
        const targetWidth = 800;
        const targetHeight = 600;
        const aspectRatio = targetWidth / targetHeight;

        // Вычисляем новые размеры с сохранением пропорций
        let newWidth, newHeight;

        if (containerWidth / containerHeight > aspectRatio) {
            // Широкий контейнер
            newHeight = containerHeight;
            newWidth = newHeight * aspectRatio;
        } else {
            // Высокий контейнер
            newWidth = containerWidth;
            newHeight = newWidth / aspectRatio;
        }

        // Устанавливаем размеры канваса
        this.canvas.width = targetWidth;
        this.canvas.height = targetHeight;
        this.canvas.style.width = `${newWidth}px`;
        this.canvas.style.height = `${newHeight}px`;

        // Вычисляем масштаб и отступы для правильного позиционирования кликов
        this.canvasScale = newWidth / targetWidth;
        this.canvasOffset = {
            x: (containerWidth - newWidth) / 2,
            y: (containerHeight - newHeight) / 2
        };
    }

    handleResize() {
        this.setupCanvas();
        this.render();
    }

    preloadGameState() {
        setTimeout(() => {
            this.loadGameState();
        }, 500);
    }

    async loadImages() {
        const imagesToLoad = {
            pokemons: [
                'charmander', 'squirtle', 'bulbasaur', 'pikachu',
                'jigglypuff', 'meowth', 'psyduck', 'growlithe',
                'abra', 'machop'
            ],
            enemies: ['rattata', 'spearow', 'zubat', 'geodude'],
            ui: ['pokeball', 'pokeball_open']
        };

        const loadPromises = [];

        // Загрузка покемонов
        imagesToLoad.pokemons.forEach(name => {
            const img = new Image();
            img.src = `/static/images/pokemons/${name}.png`;
            this.images[name] = img;
            loadPromises.push(new Promise(resolve => {
                img.onload = () => resolve(img);
                img.onerror = () => {
                    this.images[name] = null;
                    resolve();
                };
            }));
        });

        // Загрузка врагов
        imagesToLoad.enemies.forEach(name => {
            const img = new Image();
            img.src = `/static/images/enemies/${name}.png`;
            this.images[name] = img;
            loadPromises.push(new Promise(resolve => {
                img.onload = () => resolve(img);
                img.onerror = () => {
                    this.images[name] = null;
                    resolve();
                };
            }));
        });

        // Загрузка UI
        imagesToLoad.ui.forEach(name => {
            const img = new Image();
            img.src = `/static/images/ui/${name}.png`;
            this.images[name] = img;
            loadPromises.push(new Promise(resolve => {
                img.onload = () => resolve(img);
                img.onerror = () => {
                    this.images[name] = null;
                    resolve();
                };
            }));
        });

        await Promise.allSettled(loadPromises);
    }

    drawHealthBar(x, y, width, height, percent, bgColor = '#333', fgColor = '#ff0000') {
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(x, y, width, height);
        this.ctx.fillStyle = fgColor;
        const healthWidth = Math.max(2, width * percent);
        this.ctx.fillRect(x, y, healthWidth, height);
        this.ctx.strokeStyle = '#111';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
    }

    setupEventListeners() {
        // Кнопка открытия покебола
        const openPokeballBtn = document.getElementById('openPokeballBtn');
        if (openPokeballBtn) {
            openPokeballBtn.addEventListener('click', () => this.openPokeball());
        }

        const openPokeballBtnMobile = document.getElementById('openPokeballBtnMobile');
        if (openPokeballBtnMobile) {
            openPokeballBtnMobile.addEventListener('click', () => this.openPokeball());
        }

        // Кнопка паузы
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }

        const pauseBtnMobile = document.getElementById('pauseBtnMobile');
        if (pauseBtnMobile) {
            pauseBtnMobile.addEventListener('click', () => this.togglePause());
        }

        // Кнопка сдачи
        const quitBtn = document.getElementById('quitBtn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => this.quitGame());
        }

        const quitBtnMobile = document.getElementById('quitBtnMobile');
        if (quitBtnMobile) {
            quitBtnMobile.addEventListener('click', () => this.quitGame());
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

        // Обработка клавиши ESC для отмены выбора
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.selectedCard) {
                this.cancelCardSelection();
            }
        });
    }

    cancelCardSelection() {
        if (this.selectedCard) {
            if (this.selectedCard.element) {
                this.selectedCard.element.classList.remove('selected');
            }
            this.selectedCard = null;
            this.pendingPlacement = null;
            showNotification('Card selection cancelled', 'info');
        }
    }

    setupCardSelection() {
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.pokemon-card');
            if (card) {
                if (this.selectedCard) {
                    if (this.selectedCard.element) {
                        this.selectedCard.element.classList.remove('selected');
                    }
                }
                this.selectCard(card);
            }
        });
    }

    selectCard(card) {
        document.querySelectorAll('.pokemon-card').forEach(c => {
            c.classList.remove('selected');
        });

        card.classList.add('selected');

        this.selectedCard = {
            id: parseInt(card.dataset.cardId),
            element: card,
            name: card.querySelector('.card-name').textContent
        };

        showNotification(`Selected ${this.selectedCard.name}. Click on the field to place it.`, 'info');
        this.pendingPlacement = null;
    }

    handleCanvasClick(e) {
        if (!this.selectedCard) {
            showNotification('Select a card first by clicking on it', 'info');
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const gameX = Math.round((clickX - this.canvasOffset.x) / this.canvasScale);
        const gameY = Math.round((clickY - this.canvasOffset.y) / this.canvasScale);

        const baseY = 450;

        if (gameX < 50 || gameX > 750) {
            showNotification('Please click closer to the center of the field', 'error');
            return;
        }

        if (this.pendingPlacement) {
            if (Math.abs(this.pendingPlacement.x - gameX) < 20) {
                this.playCard(this.selectedCard.id, gameX);
                this.pendingPlacement = null;
                this.clearPlacementPreview();
            } else {
                this.pendingPlacement = { x: gameX, cardId: this.selectedCard.id };
                this.showPlacementPreview(gameX, baseY);
                showNotification(`Click again to place at position ${gameX}`, 'info');
            }
        } else {
            this.pendingPlacement = { x: gameX, cardId: this.selectedCard.id };
            this.showPlacementPreview(gameX, baseY);
            showNotification(`Click again to place at position ${gameX}`, 'info');
        }
    }

    showPlacementPreview(x, y) {
        this.ctx.save();

        const screenX = x * this.canvasScale + this.canvasOffset.x;
        const screenY = y * this.canvasScale + this.canvasOffset.y;
        const screenRadius = 40 * this.canvasScale;

        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 3 * this.canvasScale;
        this.ctx.setLineDash([5 * this.canvasScale, 5 * this.canvasScale]);
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.setLineDash([]);
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        this.ctx.lineWidth = 1 * this.canvasScale;

        this.ctx.beginPath();
        this.ctx.moveTo(screenX, screenY - 50 * this.canvasScale);
        this.ctx.lineTo(screenX, screenY + 50 * this.canvasScale);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(screenX - 50 * this.canvasScale, screenY);
        this.ctx.lineTo(screenX + 50 * this.canvasScale, screenY);
        this.ctx.stroke();

        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = `${14 * this.canvasScale}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Position: ${x}`, screenX, screenY - 60 * this.canvasScale);

        this.ctx.restore();
    }

    clearPlacementPreview() {
        this.render();
    }

    async loadGameState() {
        try {
            const state = await ApiClient.get('/game/state');
            if (state) {
                this.gameState = state;
                this.updateUI();

                if (state.game_over) {
                    this.showEndGameModal(state.victory);
                }
            }
        } catch (error) {
            if (error.message && error.message.includes('404')) {
                console.log('Game not started yet');
            } else {
                console.error('Failed to load game state:', error);
            }
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
                showNotification(`🎉 Got ${result.pokemon.name}!`, 'success');
                await this.loadGameState();
            } else {
                showNotification(result.error || 'Failed to open pokeball', 'error');
            }
        } catch (error) {
            console.error('Failed to open pokeball:', error);
            showNotification('Failed to open pokeball', 'error');
        }
    }

    async playCard(cardId, x) {
        try {
            const result = await ApiClient.post('/game/action', {
                action_type: 'play_card',
                data: {
                    card_id: cardId,
                    x: Math.round(x)
                }
            });

            if (result.success) {
                showNotification('✅ Pokemon placed on field!', 'success');
                await this.loadGameState();

                if (this.selectedCard && this.selectedCard.element) {
                    this.selectedCard.element.classList.remove('selected');
                }
                this.selectedCard = null;
                this.pendingPlacement = null;
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
        const pauseBtnMobile = document.getElementById('pauseBtnMobile');

        const updateButton = (btn, isRunning) => {
            if (btn) {
                if (isRunning) {
                    btn.innerHTML = '<span class="btn-icon">⏸️</span><span class="btn-text">Pause</span>';
                    btn.style.background = 'linear-gradient(135deg, var(--warning-color) 0%, #ffa500 100%)';
                } else {
                    btn.innerHTML = '<span class="btn-icon">▶️</span><span class="btn-text">Resume</span>';
                    btn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
                }
            }
        };

        updateButton(pauseBtn, this.isRunning);
        updateButton(pauseBtnMobile, this.isRunning);

        if (this.isRunning) {
            this.startGameLoop();
        } else {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
        }
    }

    async quitGame() {
        if (confirm('Are you sure you want to surrender? You will earn coins based on your progress.')) {
            try {
                clearInterval(this.updateInterval);
                const result = await ApiClient.post('/game/end', {});

                if (result && result.poke_coins_earned) {
                    showNotification(`🏳️ Game ended! Earned ${result.poke_coins_earned} coins.`, 'info');
                }

                setTimeout(() => {
                    window.location.href = '/lobby';
                }, 2000);
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

        ApiClient.post('/game/start', {})
            .then(() => {
                this.loadGameState();
                this.isRunning = true;
                this.startGameLoop();
                this.selectedCard = null;
                this.pendingPlacement = null;
                showNotification('New game started!', 'success');
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();

        if (this.gameState) {
            this.drawFieldElements();
            this.drawEnemies();
        }

        if (this.pendingPlacement) {
            const baseY = 450;
            this.showPlacementPreview(this.pendingPlacement.x, baseY);
        }
    }

    drawBackground() {
        // Если фоновая картинка загружена, рисуем ее
        if (this.backgroundLoaded) {
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Если картинка еще не загружена, используем простой фон
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, '#2c3e50');
            gradient.addColorStop(1, '#34495e');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawFieldElements() {
        if (!this.gameState.field) return;

        this.gameState.field.forEach(pokemon => {
            const x = pokemon.x || 100;
            const y = pokemon.y || (this.canvas.height - 150);
            const maxHealth = pokemon.max_health || pokemon.health;
            const currentHealth = pokemon.current_health || pokemon.health;
            const healthPercent = Math.max(0, currentHealth) / maxHealth;
            const pokemonName = pokemon.name.toLowerCase();
            const size = 40;

            const image = this.images[pokemonName];

            if (image && image.complete && image.naturalWidth > 0) {
                this.ctx.save();

                if (pokemon.is_moving && !pokemon.reached_enemy_base) {
                    this.ctx.filter = 'brightness(1.1)';
                    this.ctx.globalAlpha = 0.3;
                    this.ctx.drawImage(image, x - size/2 - 3, y - size/2 - 3, size, size);
                    this.ctx.globalAlpha = 1.0;
                }

                if (pokemon.reached_enemy_base) {
                    const pulse = Math.sin(Date.now() / 300) * 0.1 + 0.9;
                    this.ctx.globalAlpha = pulse;
                }

                this.ctx.drawImage(image, x - size/2, y - size/2, size, size);
                this.ctx.restore();
            } else {
                this.ctx.fillStyle = this.getElementColor(pokemon.element);
                this.ctx.beginPath();
                this.ctx.arc(x, y, size/2, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                this.ctx.fillStyle = '#fff';
                this.ctx.font = `${size/2}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(this.getElementIcon(pokemon.element), x, y + size/4);
            }

            // Имя покемона
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            this.ctx.shadowBlur = 4;
            this.ctx.fillText(pokemon.name.substring(0, 10), x, y + size + 15);
            this.ctx.shadowBlur = 0;

            // Индикатор атаки базы
            if (pokemon.reached_enemy_base) {
                this.ctx.fillStyle = '#ff0000';
                this.ctx.font = 'bold 10px Arial';
                this.ctx.fillText('⚔️ Base', x, y + size + 30);

                const damagePulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
                this.ctx.globalAlpha = damagePulse;
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(x, y, size/2 + 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
            }

            // Полоска здоровья
            const healthBarY = y - size - 15;
            this.drawHealthBar(x - 30, healthBarY, 60, 8, healthPercent);

            // Индикатор движения
            if (pokemon.is_moving && !pokemon.reached_enemy_base) {
                this.ctx.fillStyle = '#ffd700';
                this.ctx.beginPath();
                this.ctx.arc(x + size/2 + 5, healthBarY - 5, 4, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.fillStyle = '#ffd700';
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - size/2 - 10);
                this.ctx.lineTo(x - 5, y - size/2 - 20);
                this.ctx.lineTo(x + 5, y - size/2 - 20);
                this.ctx.closePath();
                this.ctx.fill();
            }

            // Линия атаки к цели
            if (pokemon.target && this.gameState.enemies && !pokemon.reached_enemy_base) {
                const targetEnemy = this.gameState.enemies.find(e => e.id === pokemon.target);
                if (targetEnemy) {
                    this.ctx.strokeStyle = '#ff4500';
                    this.ctx.lineWidth = 1.5;
                    this.ctx.setLineDash([3, 3]);
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(targetEnemy.x, targetEnemy.y);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                }
            }
        });
    }

    drawEnemies() {
        if (!this.gameState.enemies) return;

        this.gameState.enemies.forEach(enemy => {
            const x = enemy.x || Math.random() * 700 + 50;
            const y = enemy.y || 100;
            const healthPercent = (enemy.current_health || enemy.health) / enemy.health;
            const enemyName = enemy.name.toLowerCase();
            const size = 35;

            const image = this.images[enemyName];

            if (image && image.complete && image.naturalWidth > 0) {
                this.ctx.drawImage(image, x - size/2, y - size/2, size, size);
            } else {
                this.ctx.fillStyle = '#dc3545';
                this.ctx.beginPath();
                this.ctx.arc(x, y, size/2, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                this.ctx.fillStyle = '#fff';
                this.ctx.font = `${size/2}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText('👾', x, y + size/4);
            }

            // Имя врага
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 11px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            this.ctx.shadowBlur = 4;
            this.ctx.fillText(enemy.name.substring(0, 8), x, y + size + 10);
            this.ctx.shadowBlur = 0;

            // Полоска здоровья врага
            const enemyHealthBarY = y - size - 10;
            this.drawHealthBar(x - 25, enemyHealthBarY, 50, 6, healthPercent, '#ff6b6b', '#ffc107');

            // Индикатор движения врага
            if (y < this.canvas.height - 200) {
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.moveTo(x, y + size/2 + 5);
                this.ctx.lineTo(x - 4, y + size/2 - 5);
                this.ctx.lineTo(x + 4, y + size/2 - 5);
                this.ctx.closePath();
                this.ctx.fill();

                // Линия пути врага
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([2, 2]);
                this.ctx.beginPath();
                this.ctx.moveTo(x, y + size/2 + 5);
                this.ctx.lineTo(x, this.canvas.height - 150);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
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
            'flying': '#87CEEB',
            'rock': '#A0522D',
            'psychic': '#FF69B4',
            'fighting': '#B22222'
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
            'flying': '🕊️',
            'rock': '🪨',
            'psychic': '🔮',
            'fighting': '🥊'
        };
        return icons[element] || '⚫';
    }

    updateUI() {
        if (!this.gameState) return;

        // Здоровье
        const healthBar = document.getElementById('playerHealth');
        const healthValue = document.getElementById('healthValue');
        if (healthBar && healthValue) {
            const healthPercent = Math.max(0, this.gameState.player_health) / 100;
            healthBar.style.width = `${healthPercent * 100}%`;
            healthValue.textContent = this.gameState.player_health;

            if (healthPercent < 0.3) {
                healthBar.style.background = 'linear-gradient(90deg, #dc3545 0%, #ff6b6b 100%)';
            } else if (healthPercent < 0.6) {
                healthBar.style.background = 'linear-gradient(90deg, #ffc107 0%, #ffd166 100%)';
            } else {
                healthBar.style.background = 'linear-gradient(90deg, var(--health-color), #ff6b6b)';
            }
        }

        // Уровень и опыт
        const playerLevel = document.getElementById('playerLevel');
        const playerXpBar = document.getElementById('playerXpBar');
        const playerXpText = document.getElementById('playerXpText');

        if (playerLevel) playerLevel.textContent = this.gameState.player_level || 1;
        if (playerXpBar && playerXpText) {
            const currentXP = this.gameState.player_exp || 0;
            const maxXP = this.gameState.player_max_exp || 100;
            const expPercent = currentXP / maxXP;
            playerXpBar.style.width = `${expPercent * 100}%`;
            playerXpText.textContent = `${currentXP}/${maxXP}`;

            // Добавляем анимацию заполнения XP
            if (currentXP > 0 && expPercent > 0) {
                playerXpBar.style.animation = 'xpFill 0.5s ease-in-out';
                setTimeout(() => {
                    playerXpBar.style.animation = '';
                }, 500);
            }
        }

        // Статистика
        const updateStat = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };

        updateStat('currentWave', this.gameState.wave || 1);
        updateStat('compactWave', this.gameState.wave || 1);
        updateStat('pokeCoins', this.gameState.poke_coins || 0);
        updateStat('compactCoins', this.gameState.poke_coins || 0);

        // Покеболы
        const pokeballs = this.gameState.pokeballs || 0;
        updateStat('pokeballCount', pokeballs);
        updateStat('pokeballsLeft', pokeballs);
        updateStat('pokeballsLeftMobile', pokeballs);

        const openPokeballBtn = document.getElementById('openPokeballBtn');
        const openPokeballBtnMobile = document.getElementById('openPokeballBtnMobile');

        if (openPokeballBtn) {
            openPokeballBtn.disabled = pokeballs <= 0;
            openPokeballBtn.style.opacity = pokeballs <= 0 ? '0.5' : '1';
        }

        if (openPokeballBtnMobile) {
            openPokeballBtnMobile.disabled = pokeballs <= 0;
            openPokeballBtnMobile.style.opacity = pokeballs <= 0 ? '0.5' : '1';
        }

        // Компактная статистика
        const compactHealth = document.getElementById('compactHealth');
        const compactXp = document.getElementById('compactXp');

        if (compactHealth) {
            const healthPercent = Math.max(0, this.gameState.player_health) / 100;
            compactHealth.style.width = `${healthPercent * 100}%`;
        }

        if (compactXp) {
            const currentXP = this.gameState.player_exp || 0;
            const maxXP = this.gameState.player_max_exp || 100;
            const expPercent = currentXP / maxXP;
            compactXp.style.width = `${expPercent * 100}%`;
        }

        // Рука игрока
        this.updatePlayerHand();
    }

    updatePlayerHand() {
    const handContainer = document.getElementById('handContainer');
    const handContainerMobile = document.getElementById('handContainerMobile');
    const handCount = document.getElementById('handCount');

    if (!this.gameState.hand) return;

    // Обновляем счетчик карт
    if (handCount) {
        handCount.textContent = this.gameState.hand.length;
    }

    const handHTML = this.gameState.hand.map((pokemon, index) => {
        const pokemonName = pokemon.name.toLowerCase();
        const hasImage = this.images[pokemonName] && this.images[pokemonName].complete;
        const isSelected = this.selectedCard && this.selectedCard.id === pokemon.id;

        // Определяем редкость
        const rarity = pokemon.rarity || 'common';
        const level = pokemon.level || 1;

        // Определяем цвета для дуальных стихий
        let elementClass = '';
        let borderGradient = '';

        if (pokemon.elements && pokemon.elements.length > 1) {
            const color1 = this.getElementColor(pokemon.elements[0]);
            const color2 = this.getElementColor(pokemon.elements[1]);
            elementClass = 'dual-element';
            borderGradient = `linear-gradient(180deg, ${color1} 0%, ${color1} 50%, ${color2} 50%, ${color2} 100%)`;
        } else {
            const element = pokemon.element || pokemon.elements?.[0] || 'normal';
            elementClass = `element-${element}`;
        }

        return `
            <div class="pokemon-card ${isSelected ? 'selected' : ''} ${elementClass}"
                 data-card-id="${pokemon.id}"
                 style="${borderGradient ? `--dual-color: ${borderGradient}` : ''}">

                <!-- Кружок редкости (показывается при выборе) -->
                <div class="rarity-indicator rarity-${rarity} ${isSelected ? 'visible' : ''}"></div>

                <!-- Имя покемона -->
                <div class="card-name">${pokemon.name}</div>

                <!-- Уровень -->
                <div class="card-level">Lv. ${level}</div>

                <!-- Изображение покемона -->
                <div class="card-image">
                    ${hasImage ?
                        `<img src="/static/images/pokemons/${pokemonName}.png"
                              alt="${pokemon.name}"
                              class="pokemon-img">` :
                        `<div class="card-icon">${this.getElementIcon(pokemon.element || pokemon.elements?.[0] || 'normal')}</div>`
                    }
                </div>

                <!-- Статистика -->
                <div class="card-stats">
                    <div class="stat-item">
                        <span class="stat-icon">⚔️</span>
                        <span class="stat-value">${pokemon.attack}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">🛡️</span>
                        <span class="stat-value">${pokemon.defense || pokemon.health}</span>
                    </div>
                </div>

                <!-- Элемент (скрывается при выборе) -->
                <div class="card-element ${isSelected ? 'hidden' : ''}">
                    ${pokemon.elements && pokemon.elements.length > 1 ?
                        pokemon.elements.map(el => this.getElementIcon(el)).join(' ') :
                        this.getElementIcon(pokemon.element || pokemon.elements?.[0] || 'normal')
                    }
                </div>
            </div>
        `;
    }).join('');

    // Для десктопной версии (вертикальный контейнер)
    if (handContainer) {
        if (this.gameState.hand.length === 0) {
            handContainer.innerHTML = `
                <div class="empty-hand">
                    <div class="empty-icon">🃏</div>
                    <p>No cards in hand</p>
                    <p class="hint">Open a pokeball to get Pokemon!</p>
                </div>
            `;
        } else {
            handContainer.innerHTML = handHTML;
            // Вертикальный скролл для карт
            if (this.gameState.hand.length > 3) {
                handContainer.style.overflowY = 'auto';
                handContainer.style.overflowX = 'hidden';
            } else {
                handContainer.style.overflowY = 'visible';
            }
        }
    }

    // Для мобильной версии (горизонтальный контейнер)
    if (handContainerMobile) {
        if (this.gameState.hand.length === 0) {
            handContainerMobile.innerHTML = `
                <div class="empty-hand">
                    <div class="empty-icon">🃏</div>
                    <p>No cards in hand</p>
                    <p class="hint">Open a pokeball!</p>
                </div>
            `;
        } else {
            handContainerMobile.innerHTML = handHTML;
        }
    }
}
    async showEndGameModal(victory) {
        const modal = document.getElementById('endGameModal');
        const title = document.getElementById('gameResultTitle');

        if (!modal || !title) return;

        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        clearInterval(this.updateInterval);

        title.textContent = victory ? '🎉 Victory! 🎉' : '💀 Game Over 💀';
        title.style.color = victory ? '#28a745' : '#dc3545';

        try {
            const result = await ApiClient.post('/game/end', {});

            if (result) {
                document.getElementById('finalCoins').textContent = result.poke_coins_earned || 0;
                document.getElementById('finalWaves').textContent = result.waves_completed || 0;
                document.getElementById('finalEnemies').textContent = result.enemies_defeated || 0;

                const userData = await ApiClient.get('/users/coins');
                if (userData && userData.poke_coins !== undefined) {
                    document.getElementById('totalCoins').textContent = userData.poke_coins;
                } else {
                    document.getElementById('totalCoins').textContent = (this.gameState.poke_coins || 0) + (result.poke_coins_earned || 0);
                }

                showNotification(victory ?
                    `🎉 Victory! Earned ${result.poke_coins_earned} coins!` :
                    `Game Over. Earned ${result.poke_coins_earned} coins.`,
                    victory ? 'success' : 'info'
                );
            }
        } catch (error) {
            console.error('Error ending game:', error);
            document.getElementById('finalCoins').textContent = this.gameState.poke_coins || 0;
            document.getElementById('finalWaves').textContent = (this.gameState.wave || 1) - 1;
            document.getElementById('finalEnemies').textContent = Math.floor((this.gameState.score || 0) / 10);
            document.getElementById('totalCoins').textContent = this.gameState.poke_coins || 0;

            showNotification('Game ended with some issues', 'warning');
        }

        modal.classList.add('active');

        if (typeof loadUserData === 'function') {
            setTimeout(loadUserData, 1000);
        }
    }
}

// Инициализация игры
document.addEventListener('DOMContentLoaded', () => {
    if (typeof checkAuth === 'function' && !checkAuth()) {
        window.location.href = '/login';
        return;
    }

    const gameCanvas = document.getElementById('gameCanvas');
    if (!gameCanvas) {
        console.error('Game canvas not found!');
        return;
    }

    try {
        window.gameClient = new GameClient();
        console.log('🎮 Game client initialized');
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showNotification('Failed to start the game. Please refresh the page.', 'error');
    }
});