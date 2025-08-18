/**
 * index.ts - Main entry point for the background service worker.
 * Initializes and connects all the different modules.
 */
import { CallData } from '../types';
import { backgroundEventBus } from './EventBus';
import { CallStorage } from './CallStorage';
import { FinesseMonitor } from './FinesseMonitor';

console.log('🚀 Oprosnik Helper Background Service v5.0 Initializing...');

// 1. Initialize services
const storage = new CallStorage();
const monitor = new FinesseMonitor(backgroundEventBus);

// 2. Setup event listeners to connect the modules
backgroundEventBus.on('call:end', async (callData: CallData) => {
  console.log('Received call:end event. Storing call data:', callData);
  await storage.addCall(callData);
});

backgroundEventBus.on('status:update', async (status: string) => {
  await chrome.storage.local.set({ lastAgentStatus: status });
});

// 3. Setup message listeners for communication with other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCallData') {
    sendResponse({
      status: 'success',
      data: storage.getHistory()
    });
    return true; // Indicates that the response is sent asynchronously
  }
});

// 4. Start the main monitoring process
async function main() {
  await storage.initialize();
  await monitor.start();
  console.log('✅ Oprosnik Helper Background Service is running.');
}

main();
