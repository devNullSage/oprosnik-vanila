/**
 * FinesseMonitor.ts - Handles the logic for monitoring the Finesse tab,
 * processing agent status, and capturing call data.
 */
import { CallData } from '../types';
import { extractAgentStatus, extractCallData } from './scraper';
import { EventBus } from './EventBus';

export class FinesseMonitor {
  private finesseTabId: number | null = null;
  private isMonitoring = false;
  private lastAgentStatus: string | null = null;
  private callStartTime: number | null = null;
  private lastCapturedData: Partial<CallData> | null = null;

  constructor(private eventBus: EventBus) {
    this.initListeners();
  }

  public async start() {
    console.log('FinesseMonitor: Starting...');
    await this.findFinesseTab();
    if (this.finesseTabId) {
      this.isMonitoring = true;
      chrome.alarms.create('finesseStatusCheck', { periodInMinutes: 0.05 }); // 3 seconds
    }
  }

  private initListeners() {
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
  }

  private async findFinesseTab() {
    try {
      const tabs = await chrome.tabs.query({ url: "https://ssial000ap008.si.rt.ru:8445/desktop/container/*" });
      if (tabs.length > 0 && tabs[0].id) {
        this.finesseTabId = tabs[0].id;
        this.eventBus.emit('finesse:connected', this.finesseTabId);
        console.log('FinesseMonitor: Finesse tab found:', this.finesseTabId);
      } else {
        this.finesseTabId = null;
        this.eventBus.emit('finesse:disconnected');
      }
    } catch (e) {
      console.error("FinesseMonitor: Error finding Finesse tab:", e);
    }
  }

  private handleTabUpdate(tabId: number, changeInfo: chrome.tabs.TabChangeInfo) {
    if (tabId === this.finesseTabId && changeInfo.status === 'complete') {
      console.log('FinesseMonitor: Finesse tab updated.');
      this.start();
    }
  }

  private handleTabRemoved(tabId: number) {
    if (tabId === this.finesseTabId) {
      console.log('FinesseMonitor: Finesse tab closed.');
      this.isMonitoring = false;
      this.finesseTabId = null;
      chrome.alarms.clear('finesseStatusCheck');
      this.eventBus.emit('finesse:disconnected');
    }
  }

  private handleAlarm(alarm: chrome.alarms.Alarm) {
    if (alarm.name === 'finesseStatusCheck' && this.isMonitoring) {
      this.checkStatus();
    }
  }

  private async checkStatus() {
    if (!this.finesseTabId) {
      await this.findFinesseTab();
      if (!this.finesseTabId) return;
    }

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: this.finesseTabId },
        func: extractAgentStatus,
      });

      if (results && results[0] && results[0].result) {
        this.processStatus(results[0].result.status);
      }
    } catch (e) {
      console.error('FinesseMonitor: Error checking status. Finesse tab might be closed or unresponsive.', e);
      this.handleTabRemoved(this.finesseTabId!);
    }
  }

  private async processStatus(currentStatus: string | null) {
    if (!currentStatus || currentStatus === this.lastAgentStatus) {
      return;
    }

    console.log(`FinesseMonitor: Status changed from '${this.lastAgentStatus}' to '${currentStatus}'`);

    // Call started
    if (currentStatus === 'Разговор' && this.lastAgentStatus !== 'Разговор') {
      this.callStartTime = Date.now();
      this.eventBus.emit('call:start');
    }

    // Call ended
    if (this.lastAgentStatus === 'Разговор' && (currentStatus === 'Завершение' || currentStatus === 'Готов')) {
      const callEndTime = Date.now();
      const calculatedDurationMs = this.callStartTime ? callEndTime - this.callStartTime : 0;

      const finalData = await this.captureFinalCallData();

      const callData: CallData = {
        phone: finalData?.phone || 'Неизвестно',
        duration: finalData?.duration || this.formatDuration(calculatedDurationMs),
        region: finalData?.region || 'Не указан',
        timestamp: callEndTime,
        source: finalData?.duration ? 'interface' : 'calculated',
        completedAt: new Date(callEndTime).toISOString(),
      };

      this.eventBus.emit('call:end', callData);
    }

    this.lastAgentStatus = currentStatus;
    this.eventBus.emit('status:update', currentStatus);
  }

  private async captureFinalCallData(): Promise<Partial<CallData> | null> {
    if (!this.finesseTabId) return null;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: this.finesseTabId },
        func: extractCallData,
      });
      return results[0].result;
    } catch (e) {
      console.error("FinesseMonitor: Could not capture final call data.", e);
      return null;
    }
  }

  private formatDuration(ms: number): string {
    if (!ms || ms < 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
