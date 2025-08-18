/**
 * popup.js - Скрипт для popup окна диагностики
 */

async function updateStatus() {
    try {
        // Получаем данные из storage
        const data = await chrome.storage.local.get([
            'callHistory',
            'lastAgentStatus',
            'lastUpdate'
        ]);
        
        // Проверяем наличие вкладки Finesse
        const tabs = await chrome.tabs.query({
            url: "https://ssial000ap008.si.rt.ru:8445/desktop/container/*"
        });
        
        // Обновляем статусы
        const monitoringEl = document.getElementById('monitoring-status');
        const finesseEl = document.getElementById('finesse-status');
        const agentEl = document.getElementById('agent-status');
        const countEl = document.getElementById('history-count');
        
        if (tabs.length > 0) {
            monitoringEl.textContent = 'Активен';
            monitoringEl.className = 'status-value active';
            finesseEl.textContent = 'Открыта';
            finesseEl.className = 'status-value active';
        } else {
            monitoringEl.textContent = 'Ожидание';
            monitoringEl.className = 'status-value inactive';
            finesseEl.textContent = 'Не найдена';
            finesseEl.className = 'status-value inactive';
        }
        
        agentEl.textContent = data.lastAgentStatus || '—';
        
        const history = data.callHistory || [];
        countEl.textContent = history.length;
        
        // Обновляем историю
        updateHistory(history);
        
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
    }
}

function updateHistory(history) {
    const listEl = document.getElementById('history-list');
    
    if (history.length === 0) {
        listEl.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">Нет сохраненных звонков</div>';
        return;
    }
    
    listEl.innerHTML = history.map((call, index) => `
        <div class="call-item">
            <strong>${index === 0 ? '🔴 Последний' : '#' + (index + 1)}</strong><br>
            📞 ${call.phone || 'Неизвестно'}<br>
            ⏱ ${call.duration || '00:00:00'}<br>
            📍 ${call.region || 'Не указан'}<br>
            🕐 ${call.completedAt ? new Date(call.completedAt).toLocaleString('ru-RU') : 'Неизвестно'}
        </div>
    `).join('');
}

// Обработчик кнопки обновления
document.getElementById('refresh-btn').addEventListener('click', updateStatus);

// Обновляем статус при загрузке
updateStatus();

// Автообновление каждые 2 секунды
setInterval(updateStatus, 2000);
