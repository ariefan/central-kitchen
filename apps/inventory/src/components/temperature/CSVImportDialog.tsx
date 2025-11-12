import { useState, useRef } from 'react'
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
  Info,
  X,
  FileSpreadsheet,
  HelpCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// Types
interface CSVImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
}

interface CSVTemplate {
  locationCode: string
  locationName: string
  temperature: number
  unit: 'celsius' | 'fahrenheit'
  humidity?: number
  notes?: string
  recordedAt: string
  recordedBy: string
}

const csvTemplate: CSVTemplate[] = [
  {
    locationCode: 'MC-001',
    locationName: 'Main Cooler',
    temperature: 4.5,
    unit: 'celsius',
    humidity: 65,
    notes: 'Regular reading',
    recordedAt: '2024-01-15T10:30:00Z',
    recordedBy: 'John Doe',
  },
  {
    locationCode: 'FS-A001',
    locationName: 'Freezer Section A',
    temperature: -18.2,
    unit: 'celsius',
    humidity: 45,
    notes: 'Freezer operating normally',
    recordedAt: '2024-01-15T10:25:00Z',
    recordedBy: 'Jane Smith',
  },
]

export default function CSVImportDialog({
  open,
  onOpenChange,
  onSubmit
}: CSVImportDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'template' | 'guide'>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (file && file.type === 'text/csv') {
      setSelectedFile(file)
    } else {
      alert('Please select a valid CSV file')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setProgress(0)

    // Simulate processing
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i)
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Simulate success
    setTimeout(() => {
      setIsProcessing(false)
      onSubmit({
        file: selectedFile,
        success: true,
        totalRows: 150,
        importedRows: 142,
        failedRows: 8
      })
      onOpenChange(false)
      setSelectedFile(null)
      setProgress(0)
    }, 2000)
  }

  const downloadTemplate = () => {
    // Convert template to CSV
    const headers = Object.keys(csvTemplate[0]).join(',')
    const rows = csvTemplate.map(item =>
      Object.values(item).map(value =>
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    ).join('\n')

    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'temperature_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadGuide = () => {
    const guideContent = `
Temperature CSV Import Guide
============================

Required Columns:
- locationCode: Unique code for the storage location
- locationName: Human-readable location name
- temperature: Temperature reading value
- unit: Temperature unit (celsius or fahrenheit)
- recordedAt: ISO timestamp of the reading
- recordedBy: Name of person recording the reading

Optional Columns:
- humidity: Humidity percentage (0-100)
- notes: Additional notes about the reading

Data Format:
- locationCode: Text (max 20 chars)
- locationName: Text (max 100 chars)
- temperature: Number (decimal)
- unit: "celsius" or "fahrenheit"
- humidity: Number (0-100)
- recordedAt: ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
- recordedBy: Text (max 50 chars)
- notes: Text (max 500 chars)

Example:
MC-001,Main Cooler,4.5,celsius,65,Regular reading,2024-01-15T10:30:00Z,John Doe
FS-A001,Freezer Section A,-18.2,celsius,45,Freezer operating normally,2024-01-15T10:25:00Z,Jane Smith

Important Notes:
- CSV should use comma (,) as delimiter
- Text values containing commas should be enclosed in quotes
- Date/time must be in ISO 8601 format
- Temperature values are validated against location thresholds
- Maximum 10,000 rows per import
- File size limit: 10MB

Common Errors to Avoid:
- Missing required columns
- Invalid date/time format
- Temperature values outside reasonable ranges
- Invalid location codes
- Duplicate entries for same location and time
`

    const blob = new Blob([guideContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'temperature_import_guide.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>Import Temperature Data</span>
          </DialogTitle>
          <DialogDescription>
            Upload temperature readings from a CSV file or download a template to get started
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center space-x-1">
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center space-x-1">
              <FileText className="h-4 w-4" />
              <span>Template</span>
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center space-x-1">
              <HelpCircle className="h-4 w-4" />
              <span>Guide</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upload CSV File</CardTitle>
                  <CardDescription>
                    Select a CSV file containing temperature readings to import
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Upload Area */}
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                      dragActive ? "border-primary bg-primary/5" : "border-gray-300",
                      selectedFile && "border-green-500 bg-green-50"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="space-y-2">
                        <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                        <div className="font-medium">{selectedFile.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFile(null)}
                        >
                          Remove File
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                        <div className="font-medium">Drop CSV file here or click to browse</div>
                        <div className="text-sm text-muted-foreground">
                          Supports CSV files up to 10MB
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Select File
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Processing Progress */}
                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="h-4 w-4 animate-bounce" />
                        <span className="font-medium">Processing file...</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        {progress < 30 ? 'Validating file format...' :
                         progress < 60 ? 'Parsing temperature data...' :
                         progress < 90 ? 'Validating readings...' :
                         'Importing to database...'}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <Button
                      onClick={handleUpload}
                      disabled={!selectedFile || isProcessing}
                      className="flex-1"
                    >
                      {isProcessing ? 'Processing...' : 'Import Data'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('template')}
                    >
                      Download Template
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Import Limits */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Import Limits:</strong> Maximum 10,000 rows per file, 10MB file size.
                  Files with errors will be partially imported with a detailed error report.
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* Template Tab */}
            <TabsContent value="template" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">CSV Template</CardTitle>
                  <CardDescription>
                    Download a pre-formatted CSV template with the correct columns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Required Columns:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• <code className="bg-white px-1 py-0.5 rounded">locationCode</code> - Unique location identifier</li>
                      <li>• <code className="bg-white px-1 py-0.5 rounded">locationName</code> - Human-readable name</li>
                      <li>• <code className="bg-white px-1 py-0.5 rounded">temperature</code> - Temperature value</li>
                      <li>• <code className="bg-white px-1 py-0.5 rounded">unit</code> - celsius or fahrenheit</li>
                      <li>• <code className="bg-white px-1 py-0.5 rounded">recordedAt</code> - ISO timestamp</li>
                      <li>• <code className="bg-white px-1 py-0.5 rounded">recordedBy</code> - Person recording</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Optional Columns:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• <code className="bg-white px-1 py-0.5 rounded">humidity</code> - Humidity percentage</li>
                      <li>• <code className="bg-white px-1 py-0.5 rounded">notes</code> - Additional notes</li>
                    </ul>
                  </div>

                  <div className="flex space-x-3">
                    <Button onClick={downloadTemplate} className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Download CSV Template
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('guide')}
                    >
                      View Guide
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sample Data Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sample Data</CardTitle>
                  <CardDescription>
                    Preview of the template structure with example data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border">
                          <th className="border p-2 text-left font-medium">locationCode</th>
                          <th className="border p-2 text-left font-medium">locationName</th>
                          <th className="border p-2 text-left font-medium">temperature</th>
                          <th className="border p-2 text-left font-medium">unit</th>
                          <th className="border p-2 text-left font-medium">humidity</th>
                          <th className="border p-2 text-left font-medium">notes</th>
                          <th className="border p-2 text-left font-medium">recordedAt</th>
                          <th className="border p-2 text-left font-medium">recordedBy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvTemplate.map((item, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border p-2">{item.locationCode}</td>
                            <td className="border p-2">{item.locationName}</td>
                            <td className="border p-2">{item.temperature}</td>
                            <td className="border p-2">{item.unit}</td>
                            <td className="border p-2">{item.humidity}</td>
                            <td className="border p-2">{item.notes}</td>
                            <td className="border p-2 text-xs">{item.recordedAt}</td>
                            <td className="border p-2">{item.recordedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Guide Tab */}
            <TabsContent value="guide" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Import Guide</CardTitle>
                  <CardDescription>
                    Complete guide for formatting and importing temperature data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Data Format */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <Info className="h-4 w-4" />
                      <span>Data Format Requirements</span>
                    </h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• CSV format with comma (,) delimiter</li>
                      <li>• First row must contain column headers</li>
                      <li>• Text values with commas must be enclosed in quotes</li>
                      <li>• Date/time must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)</li>
                      <li>• Temperature values can be positive or negative decimals</li>
                    </ul>
                  </div>

                  <Separator />

                  {/* Validation Rules */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Validation Rules</span>
                    </h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• locationCode: Required, max 20 characters, unique</li>
                      <li>• locationName: Required, max 100 characters</li>
                      <li>• temperature: Required, number, -50°C to 100°C range</li>
                      <li>• unit: Required, must be "celsius" or "fahrenheit"</li>
                      <li>• humidity: Optional, number, 0-100% range</li>
                      <li>• recordedAt: Required, valid ISO timestamp</li>
                      <li>• recordedBy: Required, max 50 characters</li>
                      <li>• notes: Optional, max 500 characters</li>
                    </ul>
                  </div>

                  <Separator />

                  {/* Common Errors */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Common Errors to Avoid</span>
                    </h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• Missing required columns or empty rows</li>
                      <li>• Invalid date/time format (use ISO 8601)</li>
                      <li>• Temperature values outside reasonable ranges</li>
                      <li>• Invalid location codes that don't exist in system</li>
                      <li>• Duplicate entries for same location and time</li>
                      <li>• Using wrong delimiter (must be comma)</li>
                      <li>• Files larger than 10MB or more than 10,000 rows</li>
                    </ul>
                  </div>

                  <div className="flex space-x-3">
                    <Button onClick={downloadGuide} className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Download Complete Guide
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('template')}
                    >
                      Get Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}