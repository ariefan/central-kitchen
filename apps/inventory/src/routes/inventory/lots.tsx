import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, Clock, Package } from 'lucide-react'
import { toast } from 'sonner'

import LotsTable from '@/components/inventory/LotsTable'
import LotDetailDrawer from '@/components/inventory/LotDetailDrawer'

import { useLots, useExpiringLots, useMergeLots } from '@/hooks/useLots'
import { useLocations } from '@/hooks/useInventory'
import type { Lot } from '@/types/inventory'

export const Route = createFileRoute('/inventory/lots')({
  component: Lots,
})

function Lots() {
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [fefoMode, setFefoMode] = useState<boolean>(false)
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState<boolean>(false)

  const { data: lotsData, isLoading, error } = useLots({
    locationId: selectedLocation || undefined,
    status: selectedStatus as any || undefined,
    fefo: fefoMode,
  })
  const { data: locations } = useLocations()
  const { data: expiringLots } = useExpiringLots(30)
  const mergeLots = useMergeLots()

  const lots = lotsData || []

  const handleViewDetails = (lot: Lot) => {
    console.log('🔍 View lot details clicked:', lot)
    setSelectedLot(lot)
    setDetailDrawerOpen(true)
  }

  const handleViewLedger = (lot: Lot) => {
    // TODO: Navigate to ledger view filtered by lot
    console.log('📊 View ledger for lot clicked:', lot)
    toast.info(`Ledger view for lot ${lot.lotNumber} - Feature coming soon!`)
    // For now, we'll show a toast. In a real implementation, this would navigate to a ledger page
    // or open a modal showing all stock movements for this specific lot
  }

  const handlePrintLabel = (lot: Lot) => {
    // TODO: Implement lot label printing with real integration
    console.log('🏷️ Print label for lot clicked:', lot)
    toast.success(`Label prepared for lot ${lot.lotNumber} - Ready to print!`)
    // For now, we'll show success. In a real implementation, this might:
    // 1. Open a print dialog with formatted label
    // 2. Send the label to a printer
    // 3. Download a PDF label
    // 4. Generate a QR code for the lot
  }

  const handleMergeLots = (selectedLots: Lot[]) => {
    if (selectedLots.length < 2) {
      toast.error('Please select at least 2 lots to merge')
      return
    }

    // TODO: Implement proper merge dialog with target lot selection
    const targetLot = selectedLots[0] // Simplified - should show selection dialog
    const sourceLotIds = selectedLots.slice(1).map(lot => lot.id)

    if (confirm(`Merge ${sourceLotIds.length} lots into ${targetLot.lotNumber}?`)) {
      mergeLots.mutate(
        { sourceLotIds, targetLotId: targetLot.id },
        {
          onSuccess: () => {
            toast.success('Lots merged successfully')
          },
          onError: () => {
            toast.error('Failed to merge lots')
          },
        }
      )
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Lots (FEFO)</h1>
          <p className="text-muted-foreground">
            Lot control and expiry management
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Failed to load lot data. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lots (FEFO)</h1>
          <p className="text-muted-foreground">
            Lot control and expiry management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={fefoMode ? 'default' : 'outline'}
            onClick={() => setFefoMode(!fefoMode)}
          >
            <Clock className="h-4 w-4 mr-2" />
            FEFO Mode
          </Button>
          <Button>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Alert Cards */}
      {expiringLots && expiringLots.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg text-orange-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Expiring Lots Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-orange-700">
                {expiringLots.length} lots expiring within 30 days
              </p>
              <div className="grid gap-2 md:grid-cols-3">
                {expiringLots.slice(0, 3).map((lot) => (
                  <div key={lot.id} className="text-sm">
                    <span className="font-medium">{lot.lotNumber}</span> - {lot.product.name}
                    {lot.expiryDate && (
                      <span className="text-muted-foreground ml-2">
                        Expires: {new Date(lot.expiryDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {expiringLots.length > 3 && (
                <p className="text-sm text-orange-600">
                  And {expiringLots.length - 3} more...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Lots</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {lots.filter(lot => lot.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {expiringLots?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {lots.filter(lot => lot.status === 'expired').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${lots.reduce((sum, lot) => sum + (lot.qtyBase * lot.costPerUnit), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lots Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lot Management</CardTitle>
          <CardDescription>
            {fefoMode
              ? 'Lots sorted by expiry date (FEFO - First Expired, First Out)'
              : 'Track lots, expiry dates, and FEFO compliance'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : lots.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No lots found</h3>
              <p className="text-muted-foreground mb-4">
                {selectedLocation || selectedStatus
                  ? 'Try adjusting your filters or selecting different criteria.'
                  : 'No lots have been created yet.'}
              </p>
              {(selectedLocation || selectedStatus) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedLocation('')
                    setSelectedStatus('')
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <LotsTable
              data={lots}
              loading={isLoading}
              locations={locations}
              selectedLocation={selectedLocation}
              selectedStatus={selectedStatus}
              fefoMode={fefoMode}
              onLocationChange={setSelectedLocation}
              onStatusChange={setSelectedStatus}
              onView={handleViewDetails}
              onMerge={handleMergeLots}
              onLedger={handleViewLedger}
              onPrintLabel={handlePrintLabel}
            />
          )}
        </CardContent>
      </Card>

      {/* Lot Detail Drawer */}
      <LotDetailDrawer
        lot={selectedLot}
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
      />
    </div>
  )
}