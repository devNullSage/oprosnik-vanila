import React, { FC } from 'react';
import { Phone, Clock, MapPin } from 'lucide-react';
import { CallData } from '../../types';

const formatRelativeTime = (timestamp: number): string => {
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

interface CallCardProps {
  call: CallData;
  isLast?: boolean;
}

const CallCard: FC<CallCardProps> = ({ call, isLast = false }) => {
  const sourceIcon = call.source === 'calculated' ? '⚡' : '📊';

  return (
    <div className={`border rounded-lg p-3 hover:bg-gray-50 transition-colors ${isLast ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="font-medium">{call.phone}</span>
            {isLast && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Последний</span>}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{call.duration}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{call.region}</span>
            <span title={call.source === 'calculated' ? 'Вычислено' : 'Из интерфейса'}>{sourceIcon}</span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {call.timestamp ? formatRelativeTime(call.timestamp) : ''}
        </div>
      </div>
    </div>
  );
};

export default CallCard;
