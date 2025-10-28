import { CallData } from '../types';

console.log('🚀 Oprosnik Helper: Filler Script starting...');

let messageAPI: typeof chrome.runtime | null = null;

function initializeMessageAPI(): boolean {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        messageAPI = chrome.runtime;
        console.log('✅ Chrome API initialized');
        return true;
    }
    console.error('❌ Extension API not available!');
    return false;
}

function safeSendMessage(message: any, callback: (response: any) => void): void {
    const apiAvailable = messageAPI !== null || initializeMessageAPI();

    if (!apiAvailable) {
        console.error('❌ Message API could not be initialized');
        callback({ status: 'error', message: 'Extension API not available' });
        return;
    }

    // Non-null assertion `!` is safe here because of the check above.
    messageAPI!.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
            console.error('❌ Message error:', chrome.runtime.lastError.message);
            callback({ status: 'error', message: chrome.runtime.lastError.message });
        } else {
            callback(response);
        }
    });
}

function showCallHistoryModal(callHistory: CallData[]): void {
    const overlay = document.createElement('div');
    overlay.id = 'oprosnik-modal-overlay';

    const modal = document.createElement('div');
    modal.id = 'oprosnik-modal-content';

    modal.innerHTML = `
        <h3>Выберите звонок для вставки</h3>
        <p>Найдено звонков в истории: ${callHistory.length}</p>
    `;

    const callList = document.createElement('div');
    callList.className = 'oprosnik-call-list';

    callHistory.forEach((call, index) => {
        const callItem = document.createElement('div');
        callItem.className = 'oprosnik-call-item';
        callItem.innerHTML = `
            <div>
                <strong>📞 ${call.phone}</strong>
                <div>
                    <span>⏱ ${call.duration}</span>
                    <span>📍 ${call.region}</span>
                    <span>🕐 ${call.completedAt ? new Date(call.completedAt).toLocaleString('ru-RU') : 'N/A'}</span>
                </div>
            </div>
            <div>${index === 0 ? '<span>Последний</span>' : `#${index + 1}`}</div>
        `;
        callItem.onclick = () => {
            pasteDataIntoComment(call);
            document.body.removeChild(overlay);
        };
        callList.appendChild(callItem);
    });

    modal.appendChild(callList);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Отмена';
    closeButton.onclick = () => document.body.removeChild(overlay);
    modal.appendChild(closeButton);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
}

function createPasteButton(): void {
    const targetButton = document.getElementById('create_inst');
    if (!targetButton) {
        console.error('Could not find target button to inject paste button.');
        return;
    }

    if (document.querySelector('.oprosnik-helper-btn')) {
        return; // Button already exists
    }

    const pasteButton = document.createElement('button');
    pasteButton.innerText = 'Вставить данные о звонке';
    pasteButton.type = 'button';
    pasteButton.className = 'btn btn-success ml-2 oprosnik-helper-btn';
    pasteButton.addEventListener('click', handlePasteButtonClick);
    targetButton.insertAdjacentElement('afterend', pasteButton);
}

function handlePasteButtonClick(event: MouseEvent): void {
    const button = event.target as HTMLButtonElement;

    const originalText = button.innerText;
    button.innerText = 'Получение данных...';
    button.disabled = true;

    safeSendMessage({ action: 'getCallData' }, (response) => {
        button.innerText = originalText;
        button.disabled = false;

        if (response?.status === 'success' && Array.isArray(response.data)) {
            if (response.data.length > 1) {
                showCallHistoryModal(response.data);
            } else if (response.data.length === 1) {
                pasteDataIntoComment(response.data[0]);
            } else {
                alert('Нет доступных данных о звонках.');
            }
        } else {
            alert(`Не удалось получить данные о звонках. ${response?.message || ''}`);
        }
    });
}

function pasteDataIntoComment(callData: CallData): void {
    const commentTextarea = document.getElementById('comment_') as HTMLTextAreaElement | null;
    if (!commentTextarea) {
        alert('Не найдено поле для вставки комментария.');
        return;
    }

    const formattedData = `
Номер телефона: ${callData.phone || ''}
Длительность: ${callData.duration || ''}
Регион: ${callData.region || ''}
`;

    commentTextarea.value = `${formattedData.trim()}\n\n${commentTextarea.value}`;
    commentTextarea.dispatchEvent(new Event('input', { bubbles: true }));
}

// --- Main Execution ---
initializeMessageAPI();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createPasteButton);
} else {
  createPasteButton();
}
