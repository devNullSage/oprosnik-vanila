/**
 * CallStorage.ts - Manages storing and retrieving call data
 * from chrome.storage.local.
 */
import { CallData } from '../types';

export class CallStorage {
  private static readonly STORAGE_KEY = 'callHistory';
  private static readonly MAX_HISTORY = 50;
  private cache: CallData[] = [];

  async initialize(): Promise<void> {
    try {
      const data = await chrome.storage.local.get(CallStorage.STORAGE_KEY);
      this.cache = data[CallStorage.STORAGE_KEY] || [];
    } catch (e) {
      console.error("Error initializing CallStorage:", e);
      this.cache = [];
    }
  }

  async addCall(call: CallData): Promise<void> {
    this.cache.unshift(call);
    if (this.cache.length > CallStorage.MAX_HISTORY) {
      this.cache = this.cache.slice(0, CallStorage.MAX_HISTORY);
    }
    await this.save();
  }

  getHistory(limit?: number): CallData[] {
    return limit ? this.cache.slice(0, limit) : [...this.cache];
  }

  getLastCall(): CallData | null {
    return this.cache[0] || null;
  }

  private async save(): Promise<void> {
    try {
      await chrome.storage.local.set({ [CallStorage.STORAGE_KEY]: this.cache });
    } catch (e) {
      console.error("Error saving to CallStorage:", e);
    }
  }
}
