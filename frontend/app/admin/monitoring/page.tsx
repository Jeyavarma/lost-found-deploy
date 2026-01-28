'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BACKEND_URL } from '@/lib/config';

interface SystemMetrics {
  activeUsers: number;
  totalItems: number;
  matchesFound: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  uptime: string;
  memoryUsage: number;
  cpuUsage: number;
  dbConnections: number;
}

interface LoginAttempt {
  _id: string;
  email: string;
  success: boolean;
  ipAddress: string;
  timestamp: string;
  userAgent: string;
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    activeUsers: 0,
    totalItems: 0,
    matchesFound: 0,
    systemHealth: 'healthy',
    uptime: '0h 0m',
    memoryUsage: 0,
    cpuUsage: 0,
    dbConnections: 0
  });
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    fetchLoginAttempts();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/system-metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setMetrics(data.metrics || metrics);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginAttempts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/login-attempts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setLoginAttempts(data.attempts || []);
    } catch (error) {
      console.error('Failed to fetch login attempts:', error);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="p-6">Loading system monitoring...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">System Monitoring</h1>
        <Button onClick={fetchMetrics}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getHealthColor(metrics.systemHealth)}>
              {metrics.systemHealth.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Matches Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.matchesFound}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>Memory Usage</span>
                <span>{metrics.memoryUsage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${metrics.memoryUsage}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>CPU Usage</span>
                <span>{metrics.cpuUsage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${metrics.cpuUsage}%` }}
                ></div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Uptime: {metrics.uptime}</p>
              <p>DB Connections: {metrics.dbConnections}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Login Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loginAttempts.slice(0, 10).map((attempt) => (
                <div key={attempt._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium">{attempt.email}</p>
                    <p className="text-xs text-gray-500">{attempt.ipAddress}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={attempt.success ? 'default' : 'destructive'}>
                      {attempt.success ? 'Success' : 'Failed'}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(attempt.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}