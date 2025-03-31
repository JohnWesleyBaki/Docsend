import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format, parseISO, formatDistanceToNow, subDays, startOfDay, endOfDay } from 'date-fns';
import { Clock, Monitor, Globe, ChevronDown, ChevronUp, BarChart2, ArrowLeft } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ViewerLocation {
  city: string;
  region: string;
  country: string;
}

interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
}

interface AnalyticsData {
  id: string;
  location: ViewerLocation;
  device_info: DeviceInfo;
  total_time: number;
  page_times: Record<string, number>;
  created_at: string;
  updated_at?: string;
}

export default function Analytics() {
  const { documentId } = useParams();
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string>("Document");
  const [expandedViews, setExpandedViews] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'activity' | 'performance'>('activity');
  const navigate = useNavigate();

  const fetchDocument = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('title')
        .eq('id', documentId)
        .single();

      if (error) throw error;
      if (data) setDocumentTitle(data.title);
    } catch (err) {
      console.error("Error fetching document title:", err);
    }
  }, [documentId]);

  const fetchAnalytics = useCallback(async () => {
    if (!documentId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('document_views')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalytics(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const performanceData = useMemo(() => {
    if (!analytics.length) return null;

    // Calculate views per day
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i));
    const viewsPerDay = last7Days.map(date => {
      const start = startOfDay(date);
      const end = endOfDay(date);
      return analytics.filter(view => {
        const viewDate = parseISO(view.created_at);
        return viewDate >= start && viewDate <= end;
      }).length;
    }).reverse();

    // Calculate average time per page across all views
    const allPageTimes: Record<string, number[]> = {};
    analytics.forEach(view => {
      Object.entries(view.page_times || {}).forEach(([page, time]) => {
        if (!allPageTimes[page]) allPageTimes[page] = [];
        allPageTimes[page].push(time);
      });
    });

    const avgPageTimes = Object.entries(allPageTimes).map(([page, times]) => ({
      page: parseInt(page),
      avgTime: times.reduce((a, b) => a + b, 0) / times.length
    })).sort((a, b) => a.page - b.page);

    return {
      viewsTimelineData: {
        labels: last7Days.map(date => format(date, 'MMM d')),
        datasets: [{
          label: 'Views',
          data: viewsPerDay,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        }]
      },
      pageTimeData: {
        labels: avgPageTimes.map(pt => `Page ${pt.page}`),
        datasets: [{
          label: 'Average Time (seconds)',
          data: avgPageTimes.map(pt => pt.avgTime),
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 1
        }]
      }
    };
  }, [analytics]);

  useEffect(() => {
    fetchDocument();
    fetchAnalytics();
  }, [fetchDocument, fetchAnalytics]);

  const toggleViewExpansion = (viewId: string) => {
    setExpandedViews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(viewId)) {
        newSet.delete(viewId);
      } else {
        newSet.add(viewId);
      }
      return newSet;
    });
  };

  const renderPageTimesChart = (pageTimes: Record<string, number>) => {
    const data = {
      labels: Object.keys(pageTimes).map(page => `Page ${page}`),
      datasets: [
        {
          label: 'Time Spent (seconds)',
          data: Object.values(pageTimes),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const seconds = context.raw;
              const minutes = Math.floor(seconds / 60);
              const remainingSeconds = seconds % 60;
              return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: number) => {
              const minutes = Math.floor(value / 60);
              const seconds = value % 60;
              return `${minutes}:${seconds.toString().padStart(2, '0')}`;
            },
          },
        },
      },
    };

    return (
      <div className="h-64">
        <Bar data={data} options={options} />
      </div>
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  const totalViews = analytics.length;
  const uniqueLocations = new Set(analytics.map(view => 
    `${view.location?.city}-${view.location?.region}-${view.location?.country}`
  )).size;
  const averageTime = analytics.reduce((acc, view) => acc + view.total_time, 0) / totalViews || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div ><button onClick={()=>{navigate(-1)}}><ArrowLeft /></button></div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{documentTitle}</h1>
        <p className="text-gray-500 mt-2">Document Analytics</p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-4 px-1 ${
              activeTab === 'activity'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`pb-4 px-1 ${
              activeTab === 'performance'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Performance
          </button>
        </nav>
      </div>

      {analytics.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No views yet</h3>
          <p className="mt-2 text-gray-500">This document hasn't been viewed yet.</p>
        </div>
      ) : activeTab === 'performance' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Views</h3>
              <p className="text-4xl font-bold text-blue-600">{totalViews}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Unique Locations</h3>
              <p className="text-4xl font-bold text-green-600">{uniqueLocations}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Avg. Time</h3>
              <p className="text-4xl font-bold text-purple-600">{formatTime(averageTime)}</p>
            </div>
          </div>
          {performanceData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Views Over Time</h3>
                <div className="h-64">
                  <Bar 
                    data={performanceData.viewsTimelineData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            precision: 0
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Average Time per Page</h3>
                <div className="h-64">
                  <Bar 
                    data={performanceData.pageTimeData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        tooltip: {
                          callbacks: {
                            label: (context: any) => {
                              return `${formatTime(context.raw)} seconds`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: (value: number) => formatTime(value)
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {analytics.map((view) => (
            <div
              key={view.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-200"
            >
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleViewExpansion(view.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {view.location?.city?.[0] || '?'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {view.location?.city || 'Unknown'} visitor
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDistanceToNow(parseISO(view.created_at))} ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatTime(view.total_time)}
                      </p>
                      <p className="text-sm text-gray-500">Total time spent</p>
                    </div>
                    {expandedViews.has(view.id) ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {expandedViews.has(view.id) && (
                <div className="border-t border-gray-100 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="flex items-center space-x-3">
                      <Monitor className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {view.device_info?.browser} on {view.device_info?.os}
                        </p>
                        <p className="text-sm text-gray-500">{view.device_info?.device}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {view.location?.city}, {view.location?.region}
                        </p>
                        <p className="text-sm text-gray-500">{view.location?.country}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <BarChart2 className="h-5 w-5 text-gray-400" />
                      <h4 className="text-sm font-medium text-gray-700">Time spent per page</h4>
                    </div>
                    {renderPageTimesChart(view.page_times || {})}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}