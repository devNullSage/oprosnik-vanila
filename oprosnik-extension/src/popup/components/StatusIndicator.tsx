import React, { FC } from 'react';

interface StatusIndicatorProps {
  active: boolean;
  label: string;
}

const StatusIndicator: FC<StatusIndicatorProps> = ({ active, label }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
    <span className={`text-sm ${active ? 'text-green-600' : 'text-red-600'}`}>{label}</span>
  </div>
);

export default StatusIndicator;
