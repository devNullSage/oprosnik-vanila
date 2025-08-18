import { useState, useEffect } from 'react';
import { CallData } from '../../types';

interface Status {
  monitoring: boolean;
  finesse: boolean;
  agentStatus: string | null;
  lastUpdate: number | null;
}

export function useCallData() {
  const [status, setStatus] = useState<Status>({
    monitoring: false,
    finesse: false,
    agentStatus: null,
    lastUpdate: null,
  });
  const [callHistory, setCallHistory] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      if (!chrome.storage) {
        console.warn("chrome.storage API not available. Are you in a browser extension context?");
        // Return mock data if not in extension context for testing
        const mockData = {
          callHistory: [
            { phone: '+79001234567', duration: '00:05:23', region: 'Москва', timestamp: Date.now() - 300000, source: 'interface' },
            { phone: '+79007654321', duration: '00:03:45', region: 'Санкт-Петербург', timestamp: Date.now() - 1800000, source: 'calculated' },
          ],
          lastAgentStatus: 'Готов (Mock)',
        };
        setCallHistory(mockData.callHistory as CallData[]);
        setStatus(prev => ({...prev, agentStatus: mockData.lastAgentStatus}));
        return;
      }

      const data = await chrome.storage.local.get(['callHistory', 'lastAgentStatus', 'lastUpdate']);
      const tabs = await chrome.tabs.query({ url: "https://ssial000ap008.si.rt.ru:8445/desktop/container/*" });

      setCallHistory(data.callHistory || []);
      setStatus({
        monitoring: true, // Assuming background script is always monitoring
        finesse: tabs.length > 0,
        agentStatus: data.lastAgentStatus || null,
        lastUpdate: data.lastUpdate || null,
      });
    } catch (error) {
      console.error('Error loading data from chrome storage:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(); // Initial load

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local') {
        loadData(); // Reload data on any change in local storage
      }
    };

    chrome.storage?.onChanged.addListener(listener);

    return () => {
      chrome.storage?.onChanged.removeListener(listener);
    };
  }, []);

  return { status, callHistory, loading, refresh: loadData };
}
