import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'sonner';
import Header from '../layout/Header';
import MainLayout from '../layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Database,
  HardDrive,
  UploadCloud
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, activityRes] = await Promise.all([
        api.get('/dashboard/metrics'),
        api.get('/dashboard/activity')
      ]);
      setMetrics(metricsRes.data);
      setActivity(activityRes.data.activity);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" data-testid="loading-spinner"></div>
        </div>
      </MainLayout>
    );
  }

  const metricCards = [
    {
      title: 'Total Files',
      value: metrics?.total_files || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      testId: 'metric-total-files'
    },
    {
      title: 'Completed',
      value: metrics?.files_completed || 0,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      testId: 'metric-completed'
    },
    {
      title: 'Pending Approval',
      value: metrics?.files_pending_approval || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      testId: 'metric-pending'
    },
    {
      title: 'Failed',
      value: metrics?.files_failed || 0,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      testId: 'metric-failed'
    },
    {
      title: 'Records Processed',
      value: metrics?.total_records_processed || 0,
      icon: Database,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      testId: 'metric-records'
    },
    {
      title: 'Storage Used',
      value: `${metrics?.storage_used_mb || 0} MB`,
      icon: HardDrive,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      testId: 'metric-storage'
    }
  ];

  return (
    <MainLayout>
      <Header
        title="Dashboard"
        subtitle="Overview of your data transformation pipeline"
      />

      <div className="p-6 md:p-8 max-w-7xl" data-testid="dashboard-page">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card
                key={metric.title}
                className="border border-border shadow-sm hover:border-accent/50 transition-colors relative overflow-hidden group"
                data-testid={metric.testId}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </CardTitle>
                  <div className={`p-2 rounded-md ${metric.bgColor}`}>
                    <Icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight font-mono">{metric.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Activity Chart and Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Chart */}
          <Card className="lg:col-span-2 border border-border shadow-sm" data-testid="activity-chart">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">File Activity (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#64748B" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#64748B" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="uploaded" fill="#0284C7" name="Uploaded" />
                    <Bar dataKey="completed" fill="#10B981" name="Completed" />
                    <Bar dataKey="failed" fill="#EF4444" name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>No activity data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border border-border shadow-sm" data-testid="quick-actions">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => navigate('/files')}
                className="w-full justify-start h-12 font-medium"
                data-testid="upload-file-btn"
              >
                <UploadCloud className="mr-2 h-5 w-5" />
                Upload New File
              </Button>
              <Button
                onClick={() => navigate('/files')}
                variant="outline"
                className="w-full justify-start h-12 font-medium"
                data-testid="view-files-btn"
              >
                <FileText className="mr-2 h-5 w-5" />
                View All Files
              </Button>
              <Button
                onClick={() => navigate('/approvals')}
                variant="outline"
                className="w-full justify-start h-12 font-medium"
                data-testid="view-approvals-btn"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                View Approvals
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
