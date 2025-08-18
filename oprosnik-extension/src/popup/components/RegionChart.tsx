import React, { FC, useMemo } from 'react';
import { CallData } from '../../types';

interface RegionChartProps {
  history: CallData[];
}

const RegionChart: FC<RegionChartProps> = ({ history }) => {
  const regionCounts = useMemo(() => history.reduce((acc, call) => {
    if (call.region) {
      acc[call.region] = (acc[call.region] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>), [history]);

  const maxCount = useMemo(() => Math.max(1, ...Object.values(regionCounts)), [regionCounts]);

  const sortedRegions = useMemo(() => Object.entries(regionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5), [regionCounts]);

  if (sortedRegions.length === 0) {
    return <div className="text-sm text-gray-500 text-center">Нет данных по регионам</div>;
  }

  return (
    <div className="space-y-2">
      {sortedRegions.map(([region, count]) => (
          <div key={region} className="flex items-center gap-2">
            <span className="text-sm w-24 truncate" title={region}>{region}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
              <div
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
              <span className="absolute right-2 top-0.5 text-xs font-medium text-white mix-blend-difference">{count}</span>
            </div>
          </div>
        ))}
    </div>
  );
};

export default RegionChart;
