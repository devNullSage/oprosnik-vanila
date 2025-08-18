import React, { useState, useEffect, useMemo } from 'react';
import { Search, Phone, Clock, MapPin, Download, RefreshCw, Activity, AlertCircle } from 'lucide-react';

const OprosnikHelperPopup = () => {
  const [status, setStatus] = useState({
    monitoring: false,
    finesse: false,
    agentStatus: null,
    lastUpdate: null
  });
  
  const [callHistory, setCallHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('current');
  const [loading, setLoading] = useState(true);

  // Симуляция получения данных из chrome.storage
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // В реальном приложении здесь будет chrome.storage.local.get()
        const mockData = {
          callHistory: [
            {
              phone: '+79001234567',
              duration: '00:05:23',
              region: 'Москва',
              timestamp: Date.now() - 1000 * 60 * 5,
              source: 'interface',
              completedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
            },
            {
              phone: '+79007654321',
              duration: '00:03:45',
              region: 'Санкт-Петербург',
              timestamp: Date.now() - 1000 * 60 * 30,
              source: 'calculated',
              completedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
            },
            {
              phone: '+79123456789',
              duration: '00:12:10',
              region: 'Новосибирск',
              timestamp: Date.now() - 1000 * 60 * 120,
              source: 'interface',
              completedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString()
            }
          ],
          lastAgentStatus: 'Готов',
          monitoring: true,
          finesse: true
        };

        setCallHistory(mockData.callHistory);
        setStatus({
          monitoring: mockData.monitoring,
          finesse: mockData.finesse,
          agentStatus: mockData.lastAgentStatus,
          lastUpdate: Date.now()
        });
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Фильтрация истории по поисковому запросу
  const filteredHistory = useMemo(() => {
    if (!searchQuery) return callHistory;
    
    const query = searchQuery.toLowerCase();
    return callHistory.filter(call => 
      call.phone.includes(query) ||
      call.region.toLowerCase().includes(query)
    );
  }, [callHistory, searchQuery]);

  // Статистика
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCalls = callHistory.filter(call => 
      new Date(call.timestamp) >= today
    );

    const totalDuration = callHistory.reduce((sum, call) => {
      const [h, m, s] = call.duration.split(':').map(Number);
      return sum + h * 3600 + m * 60 + s;
    }, 0);

    return {
      todayCount: todayCalls.length,
      totalCount: callHistory.length,
      avgDuration: callHistory.length ? Math.floor(totalDuration / callHistory.length) : 0
    };
  }, [callHistory]);

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatRelativeTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч. назад`;
    
    const days = Math.floor(hours / 24);
    return `${days} дн. назад`;
  };

  const exportToCSV = () => {
    const headers = ['Телефон', 'Длительность', 'Регион', 'Время', 'Источник'];
    const rows = callHistory.map(call => [
      call.phone,
      call.duration,
      call.region,
      new Date(call.timestamp).toLocaleString('ru-RU'),
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
  };

  const StatusIndicator = ({ active, label }) => (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
      <span className={`text-sm ${active ? 'text-green-600' : 'text-red-600'}`}>{label}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="w-96 h-96 flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-96 bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">Oprosnik Helper v4.0</h1>
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
        <button
          onClick={() => setSelectedTab('current')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            selectedTab === 'current' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Текущий статус
        </button>
        <button
          onClick={() => setSelectedTab('history')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            selectedTab === 'history' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          История ({callHistory.length})
        </button>
        <button
          onClick={() => setSelectedTab('stats')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            selectedTab === 'stats' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Статистика
        </button>
      </div>

      {/* Content */}
      <div className="p-4 h-80 overflow-y-auto">
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
                {filteredHistory.map((call, index) => (
                  <CallCard key={index} call={call} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Ничего не найдено</p>
              </div>
            )}

            <button
              onClick={exportToCSV}
              className="w-full mt-4 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Экспорт в CSV
            </button>
          </div>
        )}

        {selectedTab === 'stats' && (
          <div className="space-y-4">
            <StatCard
              icon={<Phone className="w-5 h-5 text-blue-500" />}
              label="Звонков сегодня"
              value={stats.todayCount}
            />
            <StatCard
              icon={<Clock className="w-5 h-5 text-green-500" />}
              label="Средняя длительность"
              value={formatDuration(stats.avgDuration)}
            />
            <StatCard
              icon={<Activity className="w-5 h-5 text-purple-500" />}
              label="Всего звонков"
              value={stats.totalCount}
            />
            
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

const CallCard = ({ call, isLast = false }) => {
  const sourceIcon = call.source === 'calculated' ? '⚡' : '📊';
  
  return (
    <div className={`border rounded-lg p-3 hover:bg-gray-50 transition-colors ${
      isLast ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{call.phone}</span>
            {isLast && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Последний</span>}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {call.duration}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {call.region}
            </span>
            <span title={call.source === 'calculated' ? 'Вычислено' : 'Из интерфейса'}>
              {sourceIcon}
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {formatRelativeTime(call.timestamp)}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
    {icon}
    <div className="flex-1">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  </div>
);

const RegionChart = ({ history }) => {
  const regionCounts = history.reduce((acc, call) => {
    acc[call.region] = (acc[call.region] || 0) + 1;
    return acc;
  }, {});
  
  const maxCount = Math.max(...Object.values(regionCounts));
  
  return (
    <div className="space-y-2">
      {Object.entries(regionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([region, count]) => (
          <div key={region} className="flex items-center gap-2">
            <span className="text-sm w-24 truncate">{region}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
              <div
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
              <span className="absolute right-2 top-0.5 text-xs text-gray-700">{count}</span>
            </div>
          </div>
        ))}
    </div>
  );
};

const formatRelativeTime = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  
  const days = Math.floor(hours / 24);
  return `${days} дн. назад`;
};

export default OprosnikHelperPopup;
