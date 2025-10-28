/**
 * scraper.ts - Functions for extracting data from the Finesse page.
 * These functions are injected into the Finesse page to run in its context.
 */
import { AgentStatus, CallData } from '../types';


export function extractAgentStatus(): AgentStatus {
    try {
        const statusEl = document.querySelector('#voice-state-select-headerOptionText');
        if (!statusEl || !statusEl.textContent) {
            return { status: null, timestamp: Date.now() };
        }
        return {
            status: statusEl.textContent.trim(),
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Oprosnik Helper: Error extracting agent status:', error);
        return { status: null, timestamp: Date.now() };
    }
}

export function extractCallData(): Partial<CallData> {
    try {
        const data: Partial<CallData> = {
            timestamp: Date.now()
        };

        const phoneEl = document.querySelector('[aria-label*="Участник"]');
        if (phoneEl) {
            data.phone = phoneEl.textContent?.trim() || undefined;
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
            data.region = regionEl.textContent?.trim() || undefined;
        }

        return data;
    } catch (error) {
        console.error('Oprosnik Helper: Error extracting call data:', error);
        return { timestamp: Date.now() };
    }
}
