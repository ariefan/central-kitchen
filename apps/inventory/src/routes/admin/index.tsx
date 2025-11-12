import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Settings,
  Database,
  Shield,
  Users,
  AlertTriangle,
  Activity,
  HardDrive,
  Wifi,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Mock system data
const systemStats = {
  database: {
    status: 'healthy',
    uptime: '99.9%',
    connections: 15,
    responseTime: '45ms',
    storage: 75,
  },
  server: {
    status: 'healthy',
    uptime: '99.8%',
    cpu: 45,
    memory: 68,
    disk: 62,
    network: 'stable',
  },
  security: {
    status: 'secure',
    threatsBlocked: 147,
    lastScan: '2024-11-08T10:00:00Z',
    activeUsers: 23,
    failedAttempts: 3,
  },
  performance: {
    avgResponseTime: '120ms',
    requestsPerSecond: 45,
    errorRate: '0.02%',
    uptime: '99.8%',
  }
}

const systemLogs = [
  {
    id: 1,
    timestamp: '2024-11-08T10:30:00Z',
    level: 'info',
    message: 'Database backup completed successfully',
    source: 'database',
  },
  {
    id: 2,
    timestamp: '2024-11-08T10:25:00Z',
    level: 'warning',
    message: 'High CPU usage detected on server-01',
    source: 'server',
  },
  {
    id: 3,
    timestamp: '2024-11-08T10:20:00Z',
    level: 'success',
    message: 'New user registration completed',
    source: 'auth',
  },
  {
    id: 4,
    timestamp: '2024-11-08T10:15:00Z',
    level: 'error',
    message: 'Failed to connect to external payment gateway',
    source: 'payments',
  },
  {
    id: 5,
    timestamp: '2024-11-08T10:10:00Z',
    level: 'info',
    message: 'System health check passed',
    source: 'monitoring',
  },
]

const getLevelBadge = (level: string) => {
  const badges: Record<string, { color: string; icon: React.ReactNode }> = {
    info: { color: 'bg-blue-100 text-blue-800', icon: <Activity className="w-3 h-3" /> },
    warning: { color: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="w-3 h-3" /> },
    success: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
    error: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> },
  }

  const badge = badges[level] || badges.info

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${badge.color}`}>
      {badge.icon}
      {level.toUpperCase()}
    </span>
  )
}

const getStatusIcon = (status: string) => {
  return status === 'healthy' || status === 'secure' ? (
    <CheckCircle className="w-4 h-4 text-green-600" />
  ) : (
    <XCircle className="w-4 h-4 text-red-600" />
  )
}

export const Route = createFileRoute('/admin/')({
  component: AdminIndex,
})

function AdminIndex() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate system refresh
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsRefreshing(false)
  }

  const handleSystemAction = (action: string) => {
    console.log(`System action: ${action}`)
    // Handle system actions like restart, backup, cleanup, etc.
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">System Administration</h1>
          <p className="text-muted-foreground">Monitor and manage the ERP system</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Database
              {getStatusIcon(systemStats.database.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={systemStats.database.status === 'healthy' ? 'default' : 'destructive'}>
                {systemStats.database.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Connections</span>
              <span className="font-medium">{systemStats.database.connections}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Response Time</span>
              <span className="font-medium">{systemStats.database.responseTime}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Storage</span>
                <span>{systemStats.database.storage}%</span>
              </div>
              <Progress value={systemStats.database.storage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Server
              {getStatusIcon(systemStats.server.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={systemStats.server.status === 'healthy' ? 'default' : 'destructive'}>
                {systemStats.server.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">CPU Usage</span>
              <span className="font-medium">{systemStats.server.cpu}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Memory</span>
              <span className="font-medium">{systemStats.server.memory}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Network</span>
              <Badge variant="outline">{systemStats.server.network}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              Security
              {getStatusIcon(systemStats.security.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={systemStats.security.status === 'secure' ? 'default' : 'destructive'}>
                {systemStats.security.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Users</span>
              <span className="font-medium">{systemStats.security.activeUsers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Threats Blocked</span>
              <span className="font-medium text-green-600">{systemStats.security.threatsBlocked}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Failed Attempts</span>
              <span className="font-medium">{systemStats.security.failedAttempts}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <span className="font-medium text-green-600">{systemStats.performance.uptime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Response</span>
              <span className="font-medium">{systemStats.performance.avgResponseTime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Requests/sec</span>
              <span className="font-medium">{systemStats.performance.requestsPerSecond}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Error Rate</span>
              <span className="font-medium text-green-600">{systemStats.performance.errorRate}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Actions and Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Perform common system management tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleSystemAction('backup')}
              >
                <Download className="w-4 h-4 mr-2" />
                Database Backup
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleSystemAction('cleanup')}
              >
                <HardDrive className="w-4 h-4 mr-2" />
                Cache Cleanup
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleSystemAction('restart')}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Restart Services
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleSystemAction('maintenance')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Maintenance Mode
              </Button>
            </div>

            <div className="mt-6 space-y-3">
              <div>
                <h4 className="font-medium mb-2">System Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span>2.4.1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Environment:</span>
                    <Badge variant="outline">Production</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timezone:</span>
                    <span>UTC-5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Deploy:</span>
                    <span>2024-11-01</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Logs */}
        <Card>
          <CardHeader>
            <CardTitle>System Logs</CardTitle>
            <CardDescription>
              Recent system events and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                  <div className="mt-0.5">
                    {getLevelBadge(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{log.message}</p>
                      <span className="text-xs text-muted-foreground">
                        {log.source}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Button variant="outline" size="sm" className="w-full">
                View All Logs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>
            Configure advanced system parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="api">API Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">System Name</label>
                  <Input defaultValue="Central Kitchen ERP" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Email</label>
                  <Input defaultValue="admin@company.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Timezone</label>
                  <select className="w-full p-2 border rounded-md">
                    <option>UTC-5 (Eastern Time)</option>
                    <option>UTC-6 (Central Time)</option>
                    <option>UTC-7 (Mountain Time)</option>
                    <option>UTC-8 (Pacific Time)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Session Timeout (minutes)</label>
                  <Input type="number" defaultValue="30" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Password Policy</h4>
                    <p className="text-sm text-muted-foreground">Set password requirements</p>
                  </div>
                  <Button variant="outline">Set Policy</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Session Security</h4>
                    <p className="text-sm text-muted-foreground">Manage session settings</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Cache Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cache TTL (seconds)</label>
                      <Input type="number" defaultValue="300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Max Cache Size (MB)</label>
                      <Input type="number" defaultValue="512" />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Rate Limiting</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Requests per Minute</label>
                      <Input type="number" defaultValue="1000" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Burst Limit</label>
                      <Input type="number" defaultValue="5000" />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="api" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">API Key Management</h4>
                    <p className="text-sm text-muted-foreground">Manage API access keys</p>
                  </div>
                  <Button variant="outline">
                    <Shield className="w-4 h-4 mr-2" />
                    Manage Keys
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Webhook Configuration</h4>
                    <p className="text-sm text-muted-foreground">Set up external integrations</p>
                  </div>
                  <Button variant="outline">
                    <Wifi className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">API Documentation</h4>
                    <p className="text-sm text-muted-foreground">Access API documentation</p>
                  </div>
                  <Button variant="outline">
                    <Database className="w-4 h-4 mr-2" />
                    View Docs
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}