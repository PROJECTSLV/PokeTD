// Логика лобби
class LobbyManager {
    constructor() {
        this.init();
    }

    async init() {
        if (!checkAuth()) {
            window.location.href = '/login';
            return;
        }

        await this.loadUserData();
        await this.loadStats();
        await this.loadLeaderboard();
        await this.loadRecentGames();
        this.setupEventListeners();
        this.applyAnimations();
    }

    async loadUserData() {
        try {
            const userData = await ApiClient.get('/users/me');
            if (userData) {
                // Обновляем имя пользователя
                const username = userData.username;
                document.getElementById('username').textContent = username;
                document.getElementById('playerName').textContent = username;

                // Аватар
                const avatar = document.getElementById('playerAvatar');
                if (avatar && username) {
                    avatar.textContent = username.charAt(0).toUpperCase();
                }

                // Монеты
                const coinsElement = document.getElementById('pokeCoins');
                if (coinsElement && userData.poke_coins !== undefined) {
                    coinsElement.textContent = userData.poke_coins;
                }

                console.log('✅ User data loaded:', username);
            }
        } catch (error) {
            console.error('❌ Failed to load user data:', error);
            showNotification('Failed to load user data', 'error');
        }
    }

    async loadStats() {
        try {
            const stats = await ApiClient.get('/leaderboard/my-stats');
            if (stats) {
                // Обновляем статистику
                const elements = {
                    'highScore': stats.leaderboard?.high_score,
                    'totalWaves': stats.leaderboard?.total_waves,
                    'totalEnemies': stats.leaderboard?.total_enemies
                };

                Object.entries(elements).forEach(([id, value]) => {
                    const element = document.getElementById(id);
                    if (element && value !== undefined) {
                        element.textContent = value;
                    }
                });

                console.log('✅ Stats loaded');
            }
        } catch (error) {
            console.error('❌ Failed to load stats:', error);
        }
    }

    async loadRecentGames() {
        try {
            const stats = await ApiClient.get('/leaderboard/my-stats');
            const recentGames = document.getElementById('recentGames');

            if (!recentGames || !stats?.recent_games) return;

            if (stats.recent_games.length === 0) {
                recentGames.innerHTML = `
                    <div class="empty-state">
                        <p>No games played yet</p>
                        <p style="font-size: 10px; margin-top: 5px;">Play your first game!</p>
                    </div>
                `;
                return;
            }

            recentGames.innerHTML = stats.recent_games.slice(0, 4).map(game => `
                <div class="game-item fade-in">
                    <div class="game-result ${game.victory ? 'victory' : 'defeat'}">
                        ${game.victory ? '🏆 WIN' : '💀 LOSE'}
                    </div>
                    <div class="game-score">${game.score}</div>
                    <div class="game-stats">
                        <span>🌊 ${game.waves_completed || 0}</span>
                        <span>💰 ${game.poke_coins_earned || 0}</span>
                    </div>
                    <div class="game-time">${this.formatGameTime(game.created_at)}</div>
                </div>
            `).join('');

            console.log('✅ Recent games loaded');
        } catch (error) {
            console.error('❌ Failed to load recent games:', error);
            document.getElementById('recentGames').innerHTML = `
                <div class="empty-state">
                    <p>Failed to load games</p>
                </div>
            `;
        }
    }

    formatGameTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    async loadLeaderboard() {
        try {
            const leaderboard = await ApiClient.get('/leaderboard/');
            const leaderboardList = document.getElementById('leaderboardList');

            if (!leaderboardList || !Array.isArray(leaderboard)) return;

            if (leaderboard.length === 0) {
                leaderboardList.innerHTML = `
                    <div class="empty-state">
                        <p>No leaderboard data</p>
                    </div>
                `;
                return;
            }

            leaderboardList.innerHTML = leaderboard.slice(0, 6).map((entry, index) => `
                <div class="leaderboard-item fade-in">
                    <span class="leaderboard-rank">#${index + 1}</span>
                    <span class="leaderboard-name">${entry.username}</span>
                    <span class="leaderboard-score">${entry.high_score || 0}</span>
                </div>
            `).join('');

            console.log('✅ Leaderboard loaded');
        } catch (error) {
            console.error('❌ Failed to load leaderboard:', error);
            document.getElementById('leaderboardList').innerHTML = `
                <div class="empty-state">
                    <p>Failed to load leaderboard</p>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Выбор локации
        const locationItems = document.querySelectorAll('.location-item');
        locationItems.forEach(item => {
            item.addEventListener('click', () => {
                locationItems.forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');

                const locationName = item.querySelector('h4').textContent;
                showNotification(`Selected ${locationName}`, 'info');
            });
        });

        // Кнопка начала игры
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                try {
                    startBtn.disabled = true;
                    startBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Starting...</span>';

                    showNotification('Starting your adventure...', 'info');

                    const result = await ApiClient.post('/game/start', {});

                    if (result?.message === 'Game started') {
                        showNotification('Adventure begins! Good luck!', 'success');

                        // Анимация перехода
                        document.querySelector('.lobby-container').style.opacity = '0.7';
                        setTimeout(() => {
                            window.location.href = '/play';
                        }, 800);
                    }
                } catch (error) {
                    console.error('❌ Failed to start game:', error);
                    showNotification('Failed to start game. Please try again.', 'error');

                    // Восстанавливаем кнопку
                    startBtn.disabled = false;
                    startBtn.innerHTML = '<span class="btn-icon">▶️</span><span class="btn-text">Start Adventure</span>';
                }
            });
        }

        // Навигационные кнопки
        const buttons = {
            'collectionBtn': 'Pokemon Collection',
            'shopBtn': 'Shop',
            'settingsBtn': 'Settings',
            'logoutBtn': 'Logout',
            'viewLeaderboardBtn': 'Full Leaderboard'
        };

        Object.entries(buttons).forEach(([id, feature]) => {
            const button = document.getElementById(id);
            if (button) {
                if (id === 'logoutBtn') {
                    button.addEventListener('click', () => {
                        if (confirm('Are you sure you want to logout?')) {
                            localStorage.removeItem('token');
                            localStorage.removeItem('username');
                            window.location.href = '/';
                        }
                    });
                } else {
                    button.addEventListener('click', () => {
                        showNotification(`${feature} coming soon!`, 'info');
                    });
                }
            }
        });
    }

    applyAnimations() {
        // Анимация появления элементов
        const elements = document.querySelectorAll('.lobby-card');
        elements.forEach((el, index) => {
            el.style.animationDelay = `${index * 0.1}s`;
            el.classList.add('fade-in');
        });
    }
}

// Инициализация лобби
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.lobbyManager = new LobbyManager();
        console.log('🎮 Lobby initialized');
    } catch (error) {
        console.error('❌ Failed to initialize lobby:', error);
        showNotification('Failed to load lobby', 'error');

        // Показываем сообщение об ошибке
        document.querySelector('.lobby-container').innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                padding: 20px;
                text-align: center;
                color: white;
            ">
                <h2 style="color: #ff4444; margin-bottom: 20px;">Error Loading Lobby</h2>
                <p style="margin-bottom: 20px; opacity: 0.8;">${error.message || 'Unknown error'}</p>
                <button onclick="window.location.reload()" style="
                    padding: 10px 20px;
                    background: #ff0000;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                ">
                    Reload Page
                </button>
            </div>
        `;
    }
});

// Убедимся, что утилиты доступны
if (typeof checkAuth !== 'function') {
    console.warn('checkAuth function not found');
    window.checkAuth = function() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return false;
        }
        return true;
    };
}

if (typeof ApiClient === 'undefined') {
    console.error('ApiClient not found');
}

if (typeof showNotification !== 'function') {
    console.warn('showNotification function not found');
    window.showNotification = function(message, type = 'info') {
        console.log(`${type}: ${message}`);
        alert(message);
    };
}