'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Package,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface InventoryItem {
  drug_id: string
  drug_name: string
  branch_id: string
  current_stock: number
  optimal_stock: number
  safe_stock: number
  demand_forecast: number
  status: 'normal' | 'low' | 'high' | 'critical'
}

export default function InventoryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <InventoryContent />
    </Suspense>
  )
}

function InventoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [newStock, setNewStock] = useState<string>('')
  const [aiSuggestion, setAiSuggestion] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadInventory()

    // Auto-refresh every 10 seconds to show live data without showing loading spinner
    const interval = setInterval(() => {
      loadInventory(true)
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Auto-open modal if URL parameters instruct it
    const action = searchParams.get('action')
    const drug = searchParams.get('drug')
    const branch = searchParams.get('branch')

    if (action === 'edit' && drug && branch && inventory.length > 0) {
      if (!editingItem) {
        const match = inventory.find(i => i.drug_id === drug && i.branch_id === branch)
        if (match) {
          openEditModal(match)
          // Clear parameters so it doesn't re-trigger on next polling update
          router.replace('/inventory', { scroll: false })
        }
      }
    }
  }, [searchParams, inventory])

  const openEditModal = async (item: InventoryItem) => {
    setEditingItem(item)
    setNewStock(item.current_stock.toString())
    setAiSuggestion('Loading AI suggestion...')

    try {
      const response = await fetch(`/api/v1/inventory/${item.drug_id}/${item.branch_id}/suggestions`)
      if (response.ok) {
        const data = await response.json()
        setAiSuggestion(data.suggestion)
      } else {
        setAiSuggestion('Failed to load AI suggestion.')
      }
    } catch (err) {
      setAiSuggestion('Error connecting to AI.')
    }
  }

  const handleUpdateStock = async () => {
    if (!editingItem) return
    setIsUpdating(true)
    try {
      const resp = await fetch(`/api/v1/inventory/${editingItem.drug_id}/${editingItem.branch_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_stock: parseInt(newStock) })
      })
      if (resp.ok) {
        setEditingItem(null)
        loadInventory(true)
      } else {
        alert('Failed to update inventory')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsUpdating(false)
    }
  }

  const loadInventory = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true)
    try {
      const response = await fetch('/api/v1/inventory/levels?limit=1000')
      if (!response.ok) {
        throw new Error('Failed to fetch inventory')
      }
      const data = await response.json()
      setInventory(data)
    } catch (error) {
      console.error('Failed to load inventory:', error)
      // Fallback is empty list, showing "No items found" which is correct if API fails
      setInventory([])
    } finally {
      if (!isBackground) setIsLoading(false)
    }
  }

  const filteredInventory = inventory.filter(item => {
    const term = searchQuery.toLowerCase()
    const name = item.drug_name?.toLowerCase() || ''
    const branch = item.branch_id?.toLowerCase() || ''
    return name.includes(term) || branch.includes(term)
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>
      case 'low':
        return <Badge className="bg-orange-100 text-orange-800">Low</Badge>
      case 'high':
        return <Badge className="bg-blue-100 text-blue-800">High</Badge>
      case 'normal':
        return <Badge variant="secondary">Normal</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStockPercentage = (current: number, optimal: number) => {
    return Math.round((current / optimal) * 100)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading inventory...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Monitor and manage drug inventory across branches</p>
        </div>
        <Button onClick={() => loadInventory(false)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by drug name or branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInventory.map((item) => (
          <Card key={`${item.drug_id}-${item.branch_id}`} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{item.drug_name}</CardTitle>
                {getStatusBadge(item.status)}
              </div>
              <CardDescription>{item.branch_id}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Stock Level */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Current Stock</span>
                    <span className="font-medium">{item.current_stock} units</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${item.status === 'critical' ? 'bg-red-500' :
                        item.status === 'low' ? 'bg-orange-500' :
                          item.status === 'high' ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                      style={{ width: `${Math.min(getStockPercentage(item.current_stock, item.optimal_stock), 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Optimal:</span>
                    <span className="font-medium ml-2">{item.optimal_stock}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Safe:</span>
                    <span className="font-medium ml-2">{item.safe_stock}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Forecast:</span>
                    <span className="font-medium ml-2">{item.demand_forecast}/mo</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Percent:</span>
                    <span className="font-medium ml-2">{getStockPercentage(item.current_stock, item.optimal_stock)}%</span>
                  </div>
                </div>

                {/* Status Indicators */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    {item.current_stock < item.safe_stock ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : item.current_stock > item.optimal_stock * 1.2 ? (
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm text-gray-600">
                      {item.current_stock < item.safe_stock ? 'Reorder Needed' :
                        item.current_stock > item.optimal_stock * 1.2 ? 'Overstock' : 'Good Status'}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(item)}
                    >
                      Update Stock
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/forecasting?drug=${encodeURIComponent(item.drug_name)}`)}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInventory.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              No items found
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
                <p className="text-sm text-gray-600">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {inventory.filter(i => i.status === 'critical').length}
                </p>
                <p className="text-sm text-gray-600">Critical Items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {inventory.filter(i => i.status === 'low').length}
                </p>
                <p className="text-sm text-gray-600">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {inventory.filter(i => i.status === 'normal').length}
                </p>
                <p className="text-sm text-gray-600">Good Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Editing Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Update Stock: {editingItem.drug_name}</CardTitle>
              <CardDescription>{editingItem.branch_id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">AI Recommendation</label>
                <div className="p-3 bg-blue-50 text-blue-900 rounded-md text-sm italic mt-1 font-medium border border-blue-200 shadow-inner">
                  ✨ {aiSuggestion}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">New Current Stock</label>
                <Input
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setEditingItem(null)} disabled={isUpdating}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateStock} disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
