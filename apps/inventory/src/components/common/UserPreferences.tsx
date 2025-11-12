import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Bell,
  Eye,
  Layout,
  Palette,
  Globe,
  Save,
  RefreshCw
} from 'lucide-react'

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  sidebarCollapsed: boolean
  sidebarWidth: number
  notifications: {
    email: boolean
    browser: boolean
    alerts: boolean
    reports: boolean
  }
  display: {
    density: 'comfortable' | 'compact' | 'spacious'
    showDescriptions: boolean
    compactMode: boolean
    showBadges: boolean
  }
  behavior: {
    autoSave: boolean
    confirmActions: boolean
    keyboardShortcuts: boolean
    hoverEffects: boolean
  }
}

interface UserPreferencesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preferences: UserPreferences
  onSave: (preferences: UserPreferences) => void
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  sidebarCollapsed: false,
  sidebarWidth: 72,
  notifications: {
    email: true,
    browser: true,
    alerts: true,
    reports: false
  },
  display: {
    density: 'comfortable',
    showDescriptions: true,
    compactMode: false,
    showBadges: true
  },
  behavior: {
    autoSave: true,
    confirmActions: true,
    keyboardShortcuts: true,
    hoverEffects: true
  }
}

export default function UserPreferences({
  open,
  onOpenChange,
  preferences,
  onSave
}: UserPreferencesProps) {
  const [localPreferences, setLocalPreferences] = useState<UserPreferences>(
    preferences || defaultPreferences
  )

  const form = useForm<UserPreferences>({
    defaultValues: localPreferences
  })

  const handleSave = () => {
    onSave(localPreferences)
    onOpenChange(false)
  }

  const handleReset = () => {
    setLocalPreferences(defaultPreferences)
    form.reset(defaultPreferences)
  }

  const updatePreference = (category: keyof UserPreferences, key: string, value: any) => {
    setLocalPreferences(prev => ({
      ...prev,
      [category]: typeof prev[category] === 'object'
        ? { ...prev[category], [key]: value }
        : value
    }))
  }

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>User Preferences</span>
          </DialogTitle>
          <DialogDescription>
            Customize your workspace experience and notification settings
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="sidebar">Sidebar</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Theme Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Palette className="h-4 w-4" />
                    <span>Theme</span>
                  </CardTitle>
                  <CardDescription>Choose your preferred color theme</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
                      { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
                      { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> }
                    ].map(({ value, label, icon }) => (
                      <Button
                        key={value}
                        variant={localPreferences.theme === value ? 'default' : 'outline'}
                        onClick={() => updatePreference('theme' as any, '', value)}
                        className="flex flex-col h-20 space-y-2"
                      >
                        {icon}
                        <span className="text-xs">{label}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Language Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>Language</span>
                  </CardTitle>
                  <CardDescription>Set your preferred language</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={localPreferences.language}
                    onValueChange={(value) => updatePreference('language' as any, '', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Display Density */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Layout className="h-4 w-4" />
                    <span>Display Density</span>
                  </CardTitle>
                  <CardDescription>Adjust the spacing and layout density</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    value={localPreferences.display.density}
                    onValueChange={(value) => updatePreference('display', 'density', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Show Descriptions</span>
                      <Switch
                        checked={localPreferences.display.showDescriptions}
                        onCheckedChange={(checked) => updatePreference('display', 'showDescriptions', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Show Badges</span>
                      <Switch
                        checked={localPreferences.display.showBadges}
                        onCheckedChange={(checked) => updatePreference('display', 'showBadges', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Compact Mode</span>
                      <Switch
                        checked={localPreferences.display.compactMode}
                        onCheckedChange={(checked) => updatePreference('display', 'compactMode', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-4 w-4" />
                    <span>Preview</span>
                  </CardTitle>
                  <CardDescription>See how your preferences look</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`border rounded-lg p-4 ${
                    localPreferences.display.density === 'compact' ? 'space-y-1' :
                    localPreferences.display.density === 'spacious' ? 'space-y-4' : 'space-y-3'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Sample Item</span>
                      {localPreferences.display.showBadges && (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </div>
                    {localPreferences.display.showDescriptions && (
                      <p className="text-sm text-muted-foreground">
                        This is how descriptions will appear
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sidebar" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sidebar Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Sidebar Configuration</CardTitle>
                  <CardDescription>Customize sidebar behavior and appearance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Collapsed by Default</span>
                      <p className="text-sm text-muted-foreground">
                        Start with sidebar collapsed
                      </p>
                    </div>
                    <Switch
                      checked={localPreferences.sidebarCollapsed}
                      onCheckedChange={(checked) => updatePreference('sidebarCollapsed' as any, '', checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Sidebar Width</span>
                      <span className="text-sm text-muted-foreground">
                        {localPreferences.sidebarWidth}%
                      </span>
                    </div>
                    <Slider
                      value={[localPreferences.sidebarWidth]}
                      onValueChange={([value]) => updatePreference('sidebarWidth' as any, '', value)}
                      max={100}
                      min={50}
                      step={2}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Hover Effects</span>
                      <p className="text-sm text-muted-foreground">
                        Enable hover animations
                      </p>
                    </div>
                    <Switch
                      checked={localPreferences.behavior.hoverEffects}
                      onCheckedChange={(checked) => updatePreference('behavior', 'hoverEffects', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Sidebar Preview</CardTitle>
                  <CardDescription>Preview of your sidebar settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <div
                      className="bg-muted p-4 transition-all duration-300"
                      style={{
                        width: `${localPreferences.sidebarCollapsed ? 20 : localPreferences.sidebarWidth}%`,
                        minWidth: localPreferences.sidebarCollapsed ? '60px' : '180px'
                      }}
                    >
                      <div className="space-y-2">
                        <div className="bg-background rounded p-2 text-xs">
                          {localPreferences.sidebarCollapsed ? '...' : 'Dashboard'}
                        </div>
                        <div className="bg-background rounded p-2 text-xs">
                          {localPreferences.sidebarCollapsed ? '...' : 'Inventory Management'}
                        </div>
                        <div className="bg-background rounded p-2 text-xs">
                          {localPreferences.sidebarCollapsed ? '...' : 'Operations'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <span>Notification Preferences</span>
                </CardTitle>
                <CardDescription>
                  Choose how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Delivery Methods</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">Email Notifications</span>
                          <p className="text-sm text-muted-foreground">
                            Receive updates via email
                          </p>
                        </div>
                        <Switch
                          checked={localPreferences.notifications.email}
                          onCheckedChange={(checked) => updatePreference('notifications', 'email', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">Browser Notifications</span>
                          <p className="text-sm text-muted-foreground">
                            Show browser notifications
                          </p>
                        </div>
                        <Switch
                          checked={localPreferences.notifications.browser}
                          onCheckedChange={(checked) => updatePreference('notifications', 'browser', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Notification Types</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">Alerts & Warnings</span>
                          <p className="text-sm text-muted-foreground">
                            System alerts and critical notifications
                          </p>
                        </div>
                        <Switch
                          checked={localPreferences.notifications.alerts}
                          onCheckedChange={(checked) => updatePreference('notifications', 'alerts', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">Reports Ready</span>
                          <p className="text-sm text-muted-foreground">
                            When reports are generated
                          </p>
                        </div>
                        <Switch
                          checked={localPreferences.notifications.reports}
                          onCheckedChange={(checked) => updatePreference('notifications', 'reports', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="behavior" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Behavior Settings</CardTitle>
                <CardDescription>
                  Configure application behavior and workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Auto-save</span>
                        <p className="text-sm text-muted-foreground">
                          Automatically save work
                        </p>
                      </div>
                      <Switch
                        checked={localPreferences.behavior.autoSave}
                        onCheckedChange={(checked) => updatePreference('behavior', 'autoSave', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Confirm Actions</span>
                        <p className="text-sm text-muted-foreground">
                          Show confirmation dialogs
                        </p>
                      </div>
                      <Switch
                        checked={localPreferences.behavior.confirmActions}
                        onCheckedChange={(checked) => updatePreference('behavior', 'confirmActions', checked)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Keyboard Shortcuts</span>
                        <p className="text-sm text-muted-foreground">
                          Enable keyboard shortcuts
                        </p>
                      </div>
                      <Switch
                        checked={localPreferences.behavior.keyboardShortcuts}
                        onCheckedChange={(checked) => updatePreference('behavior', 'keyboardShortcuts', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Hover Effects</span>
                        <p className="text-sm text-muted-foreground">
                        Enable hover animations
                        </p>
                      </div>
                      <Switch
                        checked={localPreferences.behavior.hoverEffects}
                        onCheckedChange={(checked) => updatePreference('behavior', 'hoverEffects', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}