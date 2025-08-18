/**
 * background.js - Версия с активным мониторингом
 * Основная логика парсинга перенесена в background service worker
 */

console.log('🚀 Background Service Worker с активным мониторингом запущен');

// Функции для выполнения на странице (должны быть вне класса)
function extractAgentStatus() {
    try {
        const statusEl = document.querySelector('#voice-state-select-headerOptionText');
        return {
            status: statusEl ? statusEl.textContent.trim() : null,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Ошибка при извлечении статуса агента:', error);
        return { status: null, timestamp: Date.now() };
    }
}

function extractCallData() {
    try {
        const data = {
            phone: null,
            duration: null,
            region: null,
            timestamp: Date.now()
        };
        
        // Ищем номер телефона
        const phoneEl = document.querySelector('[aria-label*="Участник"]');
        if (phoneEl) {
            data.phone = phoneEl.textContent.trim();
        }
        
        // Подробная диагностика всех элементов с таймерами
        console.log('🔍 Диагностика элементов таймера:');
        
        // Все элементы с role="timer"
        const timerRoleElements = document.querySelectorAll('[role="timer"]');
        console.log('Элементы с role="timer":', timerRoleElements.length);
        timerRoleElements.forEach((el, i) => {
            console.log(`Timer ${i}:`, {
                id: el.id,
                textContent: el.textContent,
                ariaLabel: el.getAttribute('aria-label'),
                classes: el.className
            });
        });
        
        // Все элементы с классами timer
        const timerClassElements = document.querySelectorAll('[class*="timer"]');
        console.log('Элементы с классом timer:', timerClassElements.length);
        timerClassElements.forEach((el, i) => {
            const text = el.textContent.trim();
            if (/\d{2}:\d{2}:\d{2}/.test(text)) {
                console.log(`Timer class ${i} (валидное время):`, {
                    id: el.id,
                    textContent: text,
                    classes: el.className
                });
            }
        });
        
        // Специфические селекторы на основе HTML структуры
        const specificSelectors = [
            '[role="timer"]',                                   // Основной селектор
            '[class*="timer-timer"]',                           // По классу
            '[id*="call-timer"]',                               // По ID
            '[aria-label*="Общее время"]',                      // По aria-label
            '.callcontrol-timer-7KaNm [role="timer"]',          // Более специфичный
            '[id$="call-timer"]',                               // ID заканчивается на call-timer
            '.timer-timer-2ZG4P',                               // Точный класс из HTML
            '[class*="callcontrol-timer"] [role="timer"]'       // Комбинированный селектор
        ];
        
        for (const selector of specificSelectors) {
            try {
                const timerEl = document.querySelector(selector);
                if (timerEl && timerEl.textContent.trim()) {
                    const timerText = timerEl.textContent.trim();
                    console.log(`Проверяем селектор ${selector}: "${timerText}"`);
                    
                    // Проверяем, что это похоже на время (формат ЧЧ:ММ:СС)
                    if (/\d{2}:\d{2}:\d{2}/.test(timerText)) {
                        data.duration = timerText;
                        console.log(`✅ Время найдено через селектор ${selector}: ${timerText}`);
                        break;
                    }
                }
            } catch (e) {
                console.log(`❌ Ошибка с селектором ${selector}:`, e.message);
            }
        }
        
        // Поиск всех элементов содержащих время
        if (!data.duration) {
            console.log('🔍 Поиск времени во всех элементах...');
            const allElements = document.querySelectorAll('*');
            let found = false;
            
            for (const el of allElements) {
                const text = el.textContent?.trim() || '';
                if (/^\d{2}:\d{2}:\d{2}$/.test(text)) {
                    console.log('📍 Найден элемент с временем:', {
                        text: text,
                        id: el.id,
                        className: el.className,
                        tagName: el.tagName,
                        ariaLabel: el.getAttribute('aria-label'),
                        role: el.getAttribute('role')
                    });
                    
                    if (!found) {
                        data.duration = text;
                        found = true;
                    }
                }
            }
        }
        
        // Ищем регион в call variable value
        const regionEl = document.querySelector('[class*="callVariableValue"] span');
        if (regionEl) {
            data.region = regionEl.textContent.trim();
        }
        
        // Альтернативный поиск региона по id
        if (!data.region) {
            const regionAltEl = document.querySelector('[id*="call-header-variable-value"]');
            if (regionAltEl) {
                data.region = regionAltEl.textContent.trim();
            }
        }
        
        // Финальное логирование
        console.log('📊 Финальные извлеченные данные:', {
            phone: data.phone,
            duration: data.duration,
            region: data.region,
            success: !!(data.phone && data.duration && data.region)
        });
        
        return data;
    } catch (error) {
        console.error('Ошибка при извлечении данных звонка:', error);
        return {
            phone: null,
            duration: null,
            region: null,
            timestamp: Date.now(),
            error: error.message
        };
    }
}

// Основной класс для мониторинга Finesse
class FinesseActiveMonitor {
    constructor() {
        this.finesseTabId = null;
        this.monitoringActive = false;
        this.currentCallData = null;
        this.callHistory = [];
        this.lastAgentStatus = null;
        this.isInCall = false;
        
        // Отслеживание времени звонка
        this.callStartTime = null;
        this.callEndTime = null;
        this.calculatedDuration = null;
        
        // Интервалы мониторинга
        this.statusCheckInterval = 3000; // Проверка статуса каждые 3 сек
        this.activeCallInterval = 1000;  // Во время звонка каждую секунду
        
        // Флаги для предотвращения race conditions
        this.isProcessingCall = false;
        this.isCapturingData = false;
        
        // Таймеры для очистки
        this.activeCallTimer = null;
        this.postCallTimer = null;
        
        this.init();
    }
    
    // Форматирование длительности из миллисекунд в ЧЧ:ММ:СС
    formatDuration(ms) {
        if (!ms || ms < 0) return '00:00:00';
        
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    async init() {
        console.log('📡 Инициализация FinesseActiveMonitor...');
        
        try {
            // Загружаем сохраненные данные
            await this.loadStoredData();
            
            // Находим вкладку Finesse
            await this.findFinesseTab();
            
            // Создаем alarm для периодической проверки
            await chrome.alarms.create('finesseStatusCheck', {
                periodInMinutes: 0.05 // каждые 3 секунды
            });
            
            // Слушаем изменения вкладок
            chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
            chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
            
            console.log('✅ Инициализация завершена');
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
    }
    
    async findFinesseTab() {
        try {
            const tabs = await chrome.tabs.query({
                url: "https://ssial000ap008.si.rt.ru:8445/desktop/container/*"
            });
            
            if (tabs.length > 0) {
                this.finesseTabId = tabs[0].id;
                console.log('✅ Найдена вкладка Finesse:', this.finesseTabId);
                this.monitoringActive = true;
                return true;
            }
            
            console.log('❌ Вкладка Finesse не найдена');
            this.monitoringActive = false;
            return false;
        } catch (error) {
            console.error('❌ Ошибка поиска вкладки Finesse:', error);
            this.monitoringActive = false;
            return false;
        }
    }
    
    // Обработка обновления вкладок
    handleTabUpdate(tabId, changeInfo, tab) {
        if (tabId === this.finesseTabId && changeInfo.status === 'complete') {
            console.log('🔄 Вкладка Finesse перезагружена');
            // Даем время на загрузку страницы
            setTimeout(() => this.checkAgentStatus(), 3000);
        }
    }
    
    // Обработка закрытия вкладок
    handleTabRemoved(tabId) {
        if (tabId === this.finesseTabId) {
            console.log('❌ Вкладка Finesse закрыта');
            this.finesseTabId = null;
            this.monitoringActive = false;
            this.cleanupTimers();
        }
    }
    
    // Очистка таймеров
    cleanupTimers() {
        if (this.activeCallTimer) {
            clearTimeout(this.activeCallTimer);
            this.activeCallTimer = null;
        }
        if (this.postCallTimer) {
            clearTimeout(this.postCallTimer);
            this.postCallTimer = null;
        }
    }
    
    // Основная функция проверки статуса агента
    async checkAgentStatus() {
        if (!this.monitoringActive || !this.finesseTabId) {
            await this.findFinesseTab();
            if (!this.finesseTabId) return;
        }
        
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: this.finesseTabId },
                func: extractAgentStatus,
                world: 'MAIN'
            });
            
            if (results && results[0] && results[0].result) {
                await this.processStatusData(results[0].result);
            }
        } catch (error) {
            console.error('❌ Ошибка при проверке статуса:', error);
            // Не отключаем мониторинг при ошибке, просто логируем
        }
    }
    
    // Обработка данных статуса
    async processStatusData(data) {
        if (!data || !data.status) return;
        
        const currentStatus = data.status;
        const previousStatus = this.lastAgentStatus;
        
        // Проверяем изменение статуса
        if (currentStatus !== previousStatus) {
            console.log(`📞 Статус изменился: ${previousStatus} → ${currentStatus}`);
            
            // Начало разговора
            if (currentStatus === 'Разговор' && !this.isInCall) {
                console.log('🔔 Начат новый звонок!');
                this.isInCall = true;
                this.callStartTime = Date.now();
                this.callEndTime = null;
                this.calculatedDuration = null;
                console.log('⏰ Время начала звонка зафиксировано:', new Date(this.callStartTime).toLocaleTimeString());
                this.startActiveCallMonitoring();
            }
            
            // Завершение звонка
            if (previousStatus === 'Разговор' && currentStatus === 'Завершение') {
                this.callEndTime = Date.now();
                const callDurationMs = this.callEndTime - this.callStartTime;
                this.calculatedDuration = this.formatDuration(callDurationMs);
                console.log('☎️ Звонок завершается...');
                console.log('⏰ Время окончания звонка:', new Date(this.callEndTime).toLocaleTimeString());
                console.log('📊 Вычисленная длительность:', this.calculatedDuration);
                this.startPostCallCapture();
            }
            
            // Переход в статус "Готов" после звонка
            if (previousStatus === 'Завершение' && currentStatus === 'Готов') {
                console.log('✅ Агент готов к новым звонкам');
                // Делаем дополнительный захват данных в статусе "Готов"
                // В этом статусе данные могут быть ещё доступны
                this.postCallTimer = setTimeout(async () => {
                    console.log('📊 Дополнительный захват в статусе "Готов"');
                    await this.captureCallData();
                }, 500);
            }
            
            this.lastAgentStatus = currentStatus;
        }
    }
    
    // Начинаем активный мониторинг звонка
    startActiveCallMonitoring() {
        console.log('🎯 Запуск активного мониторинга звонка');
        
        // Очищаем предыдущий таймер если есть
        if (this.activeCallTimer) {
            clearTimeout(this.activeCallTimer);
        }
        
        // Создаем более частый alarm
        chrome.alarms.create('activeCallMonitor', {
            periodInMinutes: 0.0167 // каждую секунду
        });
        
        // Сразу делаем первый захват
        this.captureCallData();
    }
    
    // Захват данных активного звонка
    async captureCallData() {
        if (!this.finesseTabId || this.isCapturingData) return;
        
        this.isCapturingData = true;
        
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: this.finesseTabId },
                func: extractCallData,
                world: 'MAIN'
            });
            
            if (results && results[0] && results[0].result) {
                const callData = results[0].result;
                if (callData.phone || callData.duration) {
                    this.currentCallData = callData;
                    console.log('📊 Данные звонка обновлены:', callData);
                }
            }
        } catch (error) {
            console.error('❌ Ошибка захвата данных звонка:', error);
        } finally {
            this.isCapturingData = false;
        }
    }
    
    // Быстрый захват в статусе "Завершение" - только первые 0-3 секунды
    async startPostCallCapture() {
        if (this.isProcessingCall) {
            console.log('⚠️ Захват уже в процессе, пропускаем');
            return;
        }
        
        console.log('🔄 Запуск быстрого захвата в статусе "Завершение"');
        
        this.isInCall = false;
        this.isProcessingCall = true;
        
        // Останавливаем активный мониторинг
        await chrome.alarms.clear('activeCallMonitor');
        
        // Быстрые попытки захвата только в первые 3 секунды статуса "Завершение"
        let captureAttempts = 0;
        const maxAttempts = 3; // Только 3 быстрых попытки
        const captureWindow = 3000; // Окно захвата 3 секунды
        const startTime = Date.now();
        
        const attemptCapture = async () => {
            const elapsed = Date.now() - startTime;
            
            // Проверяем, не вышли ли за окно захвата
            if (elapsed > captureWindow) {
                console.log('⏰ Окно захвата (3 сек) истекло, используем вычисленную длительность');
                await this.finalizeCallWithCalculatedDuration();
                return;
            }
            
            captureAttempts++;
            console.log(`📸 Быстрый захват ${captureAttempts}/${maxAttempts} (${elapsed}мс от начала "Завершение")`);
            
            await this.captureCallData();
            
            // Проверяем, получили ли финальное время из интерфейса
            const hasValidDuration = this.currentCallData?.duration && 
                                   this.currentCallData.duration !== '00:00:00' &&
                                   /\d{2}:\d{2}:\d{2}/.test(this.currentCallData.duration);
            
            if (hasValidDuration) {
                console.log('✅ Получено финальное время из интерфейса:', this.currentCallData.duration);
                await this.finalizeCall();
                return;
            }
            
            // Если это последняя попытка или истекло время - используем вычисленную длительность
            if (captureAttempts >= maxAttempts) {
                console.log('⏰ Исчерпаны попытки быстрого захвата, используем вычисленную длительность');
                await this.finalizeCallWithCalculatedDuration();
                return;
            }
            
            // Следующая попытка через 100мс (очень быстро)
            this.activeCallTimer = setTimeout(attemptCapture, 100);
        };
        
        // Начинаем сразу, без задержки
        await attemptCapture();
    }
    
    // Финализация с использованием вычисленной длительности
    async finalizeCallWithCalculatedDuration() {
        try {
            // Используем данные из currentCallData, но заменяем длительность на вычисленную
            const callData = {
                phone: this.currentCallData?.phone || 'Неизвестно',
                duration: this.calculatedDuration || '00:00:00',
                region: this.currentCallData?.region || 'Не указан',
                timestamp: Date.now(),
                source: 'calculated' // Помечаем, что длительность вычислена
            };
            
            console.log('💾 Финализация с вычисленной длительностью:', callData);
            
            // Добавляем метаданные
            const finalCallData = {
                ...callData,
                completedAt: new Date().toISOString(),
                savedAt: Date.now(),
                callStartTime: this.callStartTime,
                callEndTime: this.callEndTime
            };
            
            // Добавляем в историю
            this.callHistory.unshift(finalCallData);
            if (this.callHistory.length > 10) {
                this.callHistory = this.callHistory.slice(0, 10);
            }
            
            // Сохраняем в chrome.storage
            await this.saveData();
            
            // Очищаем данные звонка
            this.currentCallData = null;
            this.callStartTime = null;
            this.callEndTime = null;
            this.calculatedDuration = null;
            this.isProcessingCall = false;
            
            console.log('✅ Звонок сохранен с вычисленной длительностью');
        } catch (error) {
            console.error('❌ Ошибка финализации с вычисленной длительностью:', error);
            this.isProcessingCall = false;
        }
    }
    
    // Финализация и сохранение звонка (с данными из интерфейса)
    async finalizeCall() {
        try {
            if (!this.currentCallData) {
                console.warn('⚠️ Нет данных для сохранения, используем вычисленную длительность');
                await this.finalizeCallWithCalculatedDuration();
                return;
            }
            
            console.log('💾 Финализация звонка с данными из интерфейса:', this.currentCallData);
            
            // Добавляем метаданные
            const finalCallData = {
                ...this.currentCallData,
                completedAt: new Date().toISOString(),
                savedAt: Date.now(),
                source: 'interface', // Помечаем, что данные из интерфейса
                callStartTime: this.callStartTime,
                callEndTime: this.callEndTime,
                calculatedDuration: this.calculatedDuration // Сохраняем и вычисленную для сравнения
            };
            
            // Добавляем в историю
            this.callHistory.unshift(finalCallData);
            if (this.callHistory.length > 10) {
                this.callHistory = this.callHistory.slice(0, 10);
            }
            
            // Сохраняем в chrome.storage
            await this.saveData();
            
            // Очищаем данные звонка
            this.currentCallData = null;
            this.callStartTime = null;
            this.callEndTime = null;
            this.calculatedDuration = null;
            this.isProcessingCall = false;
            
            console.log('✅ Звонок сохранен с данными из интерфейса');
        } catch (error) {
            console.error('❌ Ошибка финализации звонка:', error);
            this.isProcessingCall = false;
        }
    }
    
    // Сохранение данных в chrome.storage
    async saveData() {
        try {
            await chrome.storage.local.set({
                callHistory: this.callHistory,
                lastCallData: this.callHistory[0] || null,
                lastAgentStatus: this.lastAgentStatus,
                lastUpdate: Date.now()
            });
            console.log('💾 Данные сохранены в storage');
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
        }
    }
    
    // Загрузка сохраненных данных
    async loadStoredData() {
        try {
            const data = await chrome.storage.local.get([
                'callHistory', 
                'lastAgentStatus'
            ]);
            
            if (data.callHistory && Array.isArray(data.callHistory)) {
                this.callHistory = data.callHistory;
                console.log(`📚 Загружена история: ${this.callHistory.length} звонков`);
            }
            
            if (data.lastAgentStatus) {
                this.lastAgentStatus = data.lastAgentStatus;
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
        }
    }
}

// Создаем экземпляр монитора
const monitor = new FinesseActiveMonitor();

// Обработчик alarm событий
chrome.alarms.onAlarm.addListener(async (alarm) => {
    try {
        if (alarm.name === 'finesseStatusCheck') {
            await monitor.checkAgentStatus();
        } else if (alarm.name === 'activeCallMonitor') {
            await monitor.captureCallData();
        }
    } catch (error) {
        console.error('❌ Ошибка в обработчике alarm:', error);
    }
});

// Обработчик сообщений от content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        console.log('📨 Получен запрос:', request.action);
        
        if (request.action === 'getCallData') {
            // Возвращаем данные из нашего монитора
            sendResponse({
                status: 'success',
                data: monitor.callHistory
            });
            return true;
        }
        
        if (request.action === 'test') {
            sendResponse({ 
                status: 'success', 
                message: 'Background service работает',
                monitorActive: monitor.monitoringActive,
                historyCount: monitor.callHistory.length
            });
            return true;
        }
    } catch (error) {
        console.error('❌ Ошибка в обработчике сообщений:', error);
        sendResponse({ status: 'error', message: error.message });
    }
});

// Диагностические функции
globalThis.monitorStatus = async function() {
    console.group('📊 Статус мониторинга');
    console.log('Активен:', monitor.monitoringActive);
    console.log('Tab ID:', monitor.finesseTabId);
    console.log('Последний статус:', monitor.lastAgentStatus);
    console.log('В звонке:', monitor.isInCall);
    console.log('Обработка звонка:', monitor.isProcessingCall);
    console.log('Захват данных:', monitor.isCapturingData);
    console.log('Текущие данные:', monitor.currentCallData);
    console.log('История:', monitor.callHistory.length, 'звонков');
    console.groupEnd();
};

globalThis.forceCheck = async function() {
    console.log('🔄 Принудительная проверка...');
    await monitor.checkAgentStatus();
};

console.log('✅ Background Service Worker готов к работе');
console.log('💡 Команды: monitorStatus(), forceCheck()');
