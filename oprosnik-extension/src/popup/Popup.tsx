import React, { useState, useEffect, useMemo, FC } from 'react';
import { Search, Phone, Clock, Activity, Download, AlertCircle } from 'lucide-react';
import { useCallData } from './hooks/useCallData';
import StatusIndicator from './components/StatusIndicator';
import CallCard from './components/CallCard';
import StatCard from './components/StatCard';
import RegionChart from './components/RegionChart';

type Tab = 'current' | 'history' | 'stats';

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const Popup: FC = () => {
  const { status, callHistory, loading } = useCallData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<Tab>('current');
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    if (chrome.runtime?.getManifest) {
      setVersion(chrome.runtime.getManifest().version);
    }
  }, []);

  const filteredHistory = useMemo(() => {
    if (!searchQuery) return callHistory;
    const query = searchQuery.toLowerCase();
    return callHistory.filter(call =>
      call.phone.toLowerCase().includes(query) ||
      (call.region && call.region.toLowerCase().includes(query))
    );
  }, [callHistory, searchQuery]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCalls = callHistory.filter(call => call.timestamp && new Date(call.timestamp) >= today);

    const totalDuration = callHistory.reduce((sum, call) => {
      if (!call.duration) return sum;
      const [h, m, s] = call.duration.split(':').map(Number);
      return sum + h * 3600 + m * 60 + s;
    }, 0);

    return {
      todayCount: todayCalls.length,
      totalCount: callHistory.length,
      avgDuration: callHistory.length ? Math.floor(totalDuration / callHistory.length) : 0
    };
  }, [callHistory]);

  const exportToCSV = () => {
    const headers = ['Телефон', 'Длительность', 'Регион', 'Время', 'Источник'];
    const rows = callHistory.map(call => [
      call.phone,
      call.duration,
      call.region,
      call.timestamp ? new Date(call.timestamp).toLocaleString('ru-RU') : 'N/A',
      call.source || 'unknown'
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calls_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="w-96 h-96 flex items-center justify-center bg-gray-50" style={{width: 384, height: 500}}>
        <Activity className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white" style={{width: 384, height: 500}}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">Oprosnik Helper v{version}</h1>
          <Activity className="w-5 h-5" />
        </div>
        <div className="flex gap-4 text-sm">
          <StatusIndicator active={status.monitoring} label="Мониторинг" />
          <StatusIndicator active={status.finesse} label="Finesse" />
        </div>
        {status.agentStatus && (
          <div className="mt-2 text-sm opacity-90">
            Статус: <span className="font-medium">{status.agentStatus}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button onClick={() => setSelectedTab('current')} className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${selectedTab === 'current' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>
          Текущий статус
        </button>
        <button onClick={() => setSelectedTab('history')} className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${selectedTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>
          История ({callHistory.length})
        </button>
        <button onClick={() => setSelectedTab('stats')} className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${selectedTab === 'stats' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>
          Статистика
        </button>
      </div>

      {/* Content */}
      <div className="p-4 h-80 overflow-y-auto" style={{maxHeight: 380}}>
        {selectedTab === 'current' && (
          <div className="space-y-4">
            {callHistory.length > 0 ? (
              <>
                <h3 className="font-medium text-gray-700 mb-2">Последний звонок</h3>
                <CallCard call={callHistory[0]} isLast={true} />
                {!status.finesse && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Вкладка Finesse не найдена</p>
                      <p className="mt-1">Откройте Cisco Finesse для автоматического сбора данных</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Нет сохраненных звонков</p>
                <p className="text-sm mt-1">Данные появятся после первого звонка</p>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'history' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по телефону или региону..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {filteredHistory.length > 0 ? (
              <div className="space-y-2">
                {filteredHistory.map((call) => (
                  <CallCard key={call.timestamp} call={call} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Ничего не найдено</p>
              </div>
            )}
            <button onClick={exportToCSV} className="w-full mt-4 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              Экспорт в CSV
            </button>
          </div>
        )}

        {selectedTab === 'stats' && (
          <div className="space-y-4">
            <StatCard icon={<Phone className="w-5 h-5 text-blue-500" />} label="Звонков сегодня" value={stats.todayCount} />
            <StatCard icon={<Clock className="w-5 h-5 text-green-500" />} label="Средняя длительность" value={formatDuration(stats.avgDuration)} />
            <StatCard icon={<Activity className="w-5 h-5 text-purple-500" />} label="Всего звонков" value={stats.totalCount} />
            <div className="mt-6 pt-4 border-t">
              <h3 className="font-medium text-gray-700 mb-3">Распределение по регионам</h3>
              <RegionChart history={callHistory} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Popup;
