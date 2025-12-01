// Утилиты для Pokemon Tower Defense

const API_BASE = '/api/v1';

class ApiClient {
    static async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers,
            });

            if (response.status === 401) {
                // Неавторизован - редирект на логин
                localStorage.removeItem('token');
                window.location.href = '/login';
                return null;
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.detail || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    static async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    static async get(endpoint) {
        return this.request(endpoint, {
            method: 'GET',
        });
    }
}

// Вспомогательные функции
function showNotification(message, type = 'info') {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Добавляем стили для анимаций
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Проверка авторизации
function checkAuth() {
    const token = localStorage.getItem('token');
    const currentPath = window.location.pathname;

    if (!token && currentPath !== '/' && currentPath !== '/login' && currentPath !== '/register') {
        window.location.href = '/login';
        return false;
    }

    if (token && (currentPath === '/' || currentPath === '/login' || currentPath === '/register')) {
        window.location.href = '/lobby';
        return false;
    }

    return true;
}

// Загрузка данных пользователя
async function loadUserData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;

        const data = await ApiClient.get('/users/me');
        return data;
    } catch (error) {
        console.error('Failed to load user data:', error);
        return null;
    }
}

// Экспортируем функции
window.ApiClient = ApiClient;
window.showNotification = showNotification;
window.checkAuth = checkAuth;
window.loadUserData = loadUserData;