import React from 'react';

interface AnalyticsSummaryProps {
  totalViews: number;
  uniqueViewers: number;
  averageTime: number;
}

export default function AnalyticsSummary({ totalViews, uniqueViewers, averageTime }: AnalyticsSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Views</h3>
        <p className="text-4xl font-bold text-blue-600">{totalViews}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Unique Viewers</h3>
        <p className="text-4xl font-bold text-green-600">{uniqueViewers}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Avg. Time on Document</h3>
        <p className="text-4xl font-bold text-purple-600">{averageTime.toFixed(1)}s</p>
      </div>
    </div>
  );
}