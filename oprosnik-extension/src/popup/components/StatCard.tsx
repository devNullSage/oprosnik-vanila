import React, { FC, ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
}

const StatCard: FC<StatCardProps> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
    {icon}
    <div className="flex-1">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  </div>
);

export default StatCard;
