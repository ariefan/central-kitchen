import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Home, Pause, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import MobileCountInterface from '@/components/stock-count/MobileCountInterface'

function MobileCountComponent() {
  const [showPauseDialog, setShowPauseDialog] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)

  // Get session ID from URL params
  const sessionId = 'sc-session-1' // This would come from route params in a real app

  const handlePause = () => {
    setShowPauseDialog(true)
  }

  const handleExit = () => {
    setShowExitDialog(true)
  }

  const handleConfirmPause = () => {
    // Save current state and navigate back to list
    window.location.href = '/stock-count'
  }

  const handleConfirmExit = () => {
    // Navigate back to list without saving
    window.location.href = '/stock-count'
  }

  return (
    <>
      {/* Floating Action Buttons */}
      <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePause}
          className="bg-background shadow-lg"
        >
          <Pause className="h-4 w-4 mr-2" />
          Pause
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExit}
          className="bg-background shadow-lg"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Exit
        </Button>
      </div>

      {/* Mobile Count Interface */}
      <MobileCountInterface
        sessionId={sessionId}
        onExit={handleExit}
        onPause={handlePause}
      />

      {/* Pause Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pause Counting Session</DialogTitle>
            <DialogDescription>
              Your progress will be saved and you can resume this count later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">What happens when you pause?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>All counted items are saved</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Session remains active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>You can resume from this point</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowPauseDialog(false)}
                className="flex-1"
              >
                Continue Counting
              </Button>
              <Button
                onClick={handleConfirmPause}
                className="flex-1"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exit Counting Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to exit? Your current progress will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-yellow-800">Warning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-yellow-700">
                <div className="flex items-center space-x-2">
                  <RotateCcw className="h-4 w-4" />
                  <span>Current item progress will be lost</span>
                </div>
                <div className="flex items-center space-x-2">
                  <RotateCcw className="h-4 w-4" />
                  <span>You'll need to start this item again</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowExitDialog(false)}
                className="flex-1"
              >
                Continue Counting
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmExit}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit Without Saving
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export const Route = createFileRoute('/stock-count/mobile')({
  component: MobileCountComponent,
})