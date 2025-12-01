// Логика лобби
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    // Загружаем данные пользователя
    const userData = await loadUserData();
    if (userData) {
        document.getElementById('playerName').textContent = userData.username;
    }

    // Загружаем статистику
    await loadStats();

    // Обработчики событий
    setupEventListeners();
});

async function loadStats() {
    try {
        const stats = await ApiClient.get('/leaderboard/my-stats');
        if (stats && stats.leaderboard) {
            const lb = stats.leaderboard;
            document.getElementById('highScore').textContent = lb.high_score || 0;
            document.getElementById('totalWaves').textContent = lb.total_waves || 0;
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

function setupEventListeners() {
    // Выбор локации
    const locationCards = document.querySelectorAll('.location-card');
    locationCards.forEach(card => {
        card.addEventListener('click', () => {
            locationCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        });
    });

    // Кнопка начала игры
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            try {
                showNotification('Starting game...', 'info');
                const result = await ApiClient.post('/game/start', {});

                if (result && result.message === 'Game started') {
                    showNotification('Game started successfully!', 'success');
                    setTimeout(() => {
                        window.location.href = '/play';
                    }, 1000);
                }
            } catch (error) {
                showNotification('Failed to start game: ' + error.message, 'error');
            }
        });
    }

    // Кнопка лидерборда
    const leaderboardBtn = document.getElementById('leaderboardBtn');
    const leaderboardModal = document.getElementById('leaderboardModal');
    const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');

    if (leaderboardBtn && leaderboardModal) {
        leaderboardBtn.addEventListener('click', async () => {
            await loadLeaderboard();
            leaderboardModal.classList.add('active');
        });
    }

    if (closeLeaderboardBtn && leaderboardModal) {
        closeLeaderboardBtn.addEventListener('click', () => {
            leaderboardModal.classList.remove('active');
        });

        // Закрытие по клику вне модального окна
        leaderboardModal.addEventListener('click', (e) => {
            if (e.target === leaderboardModal) {
                leaderboardModal.classList.remove('active');
            }
        });
    }

    // Кнопка выхода
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = '/';
        });
    }
}

async function loadLeaderboard() {
    try {
        const leaderboard = await ApiClient.get('/leaderboard/');
        const listElement = document.getElementById('leaderboardList');

        if (!leaderboard || !Array.isArray(leaderboard)) {
            listElement.innerHTML = '<p>No leaderboard data available</p>';
            return;
        }

        listElement.innerHTML = leaderboard.map((entry, index) => `
            <div class="leaderboard-item">
                <span class="leaderboard-rank">#${entry.rank || index + 1}</span>
                <span class="leaderboard-name">${entry.username}</span>
                <span class="leaderboard-score">${entry.high_score || 0}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        document.getElementById('leaderboardList').innerHTML = '<p>Error loading leaderboard</p>';
    }
}