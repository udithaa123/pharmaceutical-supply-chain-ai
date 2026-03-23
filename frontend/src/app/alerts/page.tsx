'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  Bell,
  AlertCircle
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface Alert {
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  branch_id: string
  item_id: string
  alert_type: string
  current_stock?: number
  days_until_stockout?: number
  message: string
  recommended_action: string
  timestamp: string
  is_resolved: boolean
}

interface AlertSummary {
  total_alerts: number
  critical_count: number
  warning_count: number
  info_count: number
}

export default function AlertsPage() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<AlertSummary>({
    total_alerts: 0,
    critical_count: 0,
    warning_count: 0,
    info_count: 0
  })
  const [aiInsights, setAiInsights] = useState<string>('')
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([])
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAlerts()

    // Auto-refresh every 10 seconds to show live alerts
    const interval = setInterval(() => {
      loadAlerts()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterAlerts()
  }, [alerts, severityFilter, searchQuery])

  const loadAlerts = async () => {
    setIsLoading(true)
    try {
      // In real implementation, this would call the backend API
      const response = await fetch('/api/v1/alerts')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
        setSummary({
          total_alerts: data.total_alerts || 0,
          critical_count: data.critical_count || 0,
          warning_count: data.warning_count || 0,
          info_count: data.info_count || 0
        })
        setAiInsights(data.ai_insights || 'AI insights not available')
      } else {
        console.error(`Failed to load alerts: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterAlerts = () => {
    let filtered = alerts

    // Filter by severity
    if (severityFilter !== 'all') {
      filtered = filtered.filter(alert => alert.severity === severityFilter)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(alert =>
        alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.item_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.branch_id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredAlerts(filtered)
  }

  const resolveAlert = async (alert: Alert) => {
    // Redirect to the Inventory page and auto-open the AI stock edit modal
    router.push(`/inventory?action=edit&drug=${encodeURIComponent(alert.item_id)}&branch=${encodeURIComponent(alert.branch_id)}`)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200'
      case 'WARNING': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'INFO': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4" />
      case 'WARNING': return <AlertCircle className="h-4 w-4" />
      case 'INFO': return <Bell className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const chartData = [
    { name: 'Critical', value: summary.critical_count, color: '#ef4444' },
    { name: 'Warning', value: summary.warning_count, color: '#f97316' },
    { name: 'Info', value: summary.info_count, color: '#3b82f6' }
  ]

  const branchData = [
    { branch: 'Main Branch', alerts: 2 },
    { branch: 'North Branch', alerts: 1 },
    { branch: 'South Branch', alerts: 1 },
    { branch: 'East Branch', alerts: 1 }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading alerts...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alert Monitoring</h1>
          <p className="text-gray-600 mt-1">Manage and track supply chain system alerts</p>
        </div>
        <Button onClick={loadAlerts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summary.total_alerts}</div>
            <p className="text-xs text-gray-500 mt-1">Active Alerts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.critical_count}</div>
            <p className="text-xs text-gray-500 mt-1">Immediate Action Required</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warning</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.warning_count}</div>
            <p className="text-xs text-gray-500 mt-1">Attention Needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
            <Bell className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.info_count}</div>
            <p className="text-xs text-gray-500 mt-1">System Information</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Alert Distribution by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts by Branch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="branch" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="alerts" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle>AI Alert Analysis</CardTitle>
          <CardDescription>LLM recommendations summary based on current alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm leading-6 text-gray-800 whitespace-pre-wrap">
            {aiInsights || 'AI insights not available'}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4"
                />
              </div>
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts List</CardTitle>
          <CardDescription>
            {filteredAlerts.length} of {alerts.length} total alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAlerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${alert.is_resolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                          {alert.severity === 'CRITICAL' ? 'Critical' :
                            alert.severity === 'WARNING' ? 'Warning' : 'Info'}
                        </Badge>
                        <Badge variant="secondary">{alert.branch_id}</Badge>
                        <Badge variant="secondary">{alert.item_id}</Badge>
                        <Badge variant="outline">{alert.alert_type}</Badge>
                      </div>

                      <h4 className="text-sm font-medium text-gray-900 mb-1">
                        {alert.message}
                      </h4>

                      {alert.recommended_action && (
                        <p className="text-sm text-blue-600 mb-2">
                          Recommended Action: {alert.recommended_action}
                        </p>
                      )}

                      {alert.current_stock && (
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Current Stock: {alert.current_stock}</span>
                          {alert.days_until_stockout && (
                            <span>Days until stockout: {alert.days_until_stockout}</span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center text-xs text-gray-500 mt-2">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(alert.timestamp).toLocaleString('en-US')}
                      </div>
                    </div>
                  </div>

                  {!alert.is_resolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveAlert(alert)}
                      className="flex items-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  )}

                  {alert.is_resolved && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolved
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {filteredAlerts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No alerts found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
