/**
 * scraper.ts - Functions for extracting data from the Finesse page.
 * These functions are injected into the Finesse page to run in its context.
 */

export function extractAgentStatus() {
    try {
        const statusEl = document.querySelector('#voice-state-select-headerOptionText');
        return {
            status: statusEl ? statusEl.textContent.trim() : null,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Oprosnik Helper: Error extracting agent status:', error);
        return { status: null, timestamp: Date.now() };
    }
}

export function extractCallData() {
    try {
        const data = {
            phone: null as string | null,
            duration: null as string | null,
            region: null as string | null,
            timestamp: Date.now()
        };

        const phoneEl = document.querySelector('[aria-label*="Участник"]');
        if (phoneEl) {
            data.phone = phoneEl.textContent?.trim() || null;
        }

        const specificSelectors = [
            '[role="timer"]',
            '[class*="timer-timer"]',
            '[id*="call-timer"]',
            '[aria-label*="Общее время"]',
            '.timer-timer-2ZG4P',
            '[class*="callcontrol-timer"] [role="timer"]'
        ];

        for (const selector of specificSelectors) {
            const timerEl = document.querySelector(selector);
            if (timerEl && timerEl.textContent) {
                const timerText = timerEl.textContent.trim();
                if (/\d{2}:\d{2}:\d{2}/.test(timerText)) {
                    data.duration = timerText;
                    break;
                }
            }
        }

        const regionEl = document.querySelector('[class*="callVariableValue"] span');
        if (regionEl) {
            data.region = regionEl.textContent?.trim() || null;
        }

        return data;
    } catch (error) {
        console.error('Oprosnik Helper: Error extracting call data:', error);
        return { phone: null, duration: null, region: null, timestamp: Date.now() };
    }
}
