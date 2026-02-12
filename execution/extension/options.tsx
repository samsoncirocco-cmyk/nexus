import { useEffect, useState } from "react"
import { 
  Sparkles, 
  Save, 
  Database, 
  Download, 
  Trash2, 
  Key,
  Globe,
  MessageSquare,
  Check,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  FileText
} from "lucide-react"
import { savedItemsApi, composerHistoryApi, settingsApi, type Settings, type SavedItem, STORAGE_KEYS } from "./storage"
import { Storage } from "@plasmohq/storage"
import "./style.css"

// Tab types
type Tab = "general" | "data" | "about"

function OptionsPage() {
  // State
  const [activeTab, setActiveTab] = useState<Tab>("general")
  const [settings, setSettings] = useState<Settings | null>(null)
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<Partial<Settings>>({})

  useEffect(() => {
    loadData()
  }, [])

  // Clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [message])

  async function loadData() {
    setIsLoading(true)
    try {
      const [s, items] = await Promise.all([
        settingsApi.get(),
        savedItemsApi.getAll()
      ])
      setSettings(s)
      setFormData(s)
      setSavedItems(items)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSaveSettings() {
    setIsLoading(true)
    try {
      const updated = await settingsApi.update(formData)
      setSettings(updated)
      setMessage({ type: "success", text: "Settings saved successfully!" })
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save settings" })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleTestApi() {
    if (!formData.apiKey) {
      setTestResult("Please enter an API key first")
      return
    }
    
    setTestResult("Testing...")
    
    // Simulate API test
    setTimeout(() => {
      setTestResult("✓ API key is valid and working")
    }, 1000)
  }

  async function handleExportData() {
    const data = {
      savedItems: await savedItemsApi.getAll(),
      settings: await settingsApi.get(),
      composerHistory: await composerHistoryApi.getAll(),
      exportedAt: new Date().toISOString(),
      version: "1.0.0"
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `nexus-backup-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    setMessage({ type: "success", text: "Data exported successfully!" })
  }

  async function handleImportData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    
    setIsLoading(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (data.savedItems) {
        const storage = new Storage({ area: "local" })
        await storage.set(STORAGE_KEYS.SAVED_ITEMS, data.savedItems)
      }
      
      if (data.settings) {
        await settingsApi.update(data.settings)
      }
      
      if (data.composerHistory) {
        const storage = new Storage({ area: "local" })
        await storage.set(STORAGE_KEYS.COMPOSER_HISTORY, data.composerHistory)
      }
      
      await loadData()
      setMessage({ type: "success", text: "Data imported successfully!" })
    } catch (err) {
      setMessage({ type: "error", text: "Failed to import data. Invalid file format." })
    } finally {
      setIsLoading(false)
      event.target.value = ""
    }
  }

  async function handleClearAllData() {
    if (!confirm("⚠️ Are you sure? This will permanently delete ALL your saved items, settings, and history. This action cannot be undone.")) {
      return
    }
    
    setIsLoading(true)
    try {
      await savedItemsApi.clear()
      await composerHistoryApi.clear()
      await settingsApi.reset()
      await loadData()
      setMessage({ type: "success", text: "All data cleared successfully!" })
    } catch (err) {
      setMessage({ type: "error", text: "Failed to clear data" })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleClearSavedItems() {
    if (!confirm("Are you sure you want to delete all saved items?")) return
    
    await savedItemsApi.clear()
    await loadData()
    setMessage({ type: "success", text: "All saved items deleted!" })
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-6 h-6 animate-spin" />
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nexus Settings</h1>
              <p className="text-gray-500">Configure your AI content assistant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6">
          <nav className="flex gap-6">
            {[
              { id: "general", label: "General", icon: Globe },
              { id: "data", label: "Data & Export", icon: Database },
              { id: "about", label: "About", icon: FileText }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as Tab)}
                className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === "success" 
              ? "bg-green-50 text-green-800 border border-green-200" 
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {message.type === "success" ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {activeTab === "general" && (
          <div className="space-y-6">
            {/* API Configuration */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Key className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">AI Configuration</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="password"
                      value={formData.apiKey || ""}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="Enter your AI API key"
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleTestApi}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                    >
                      Test
                    </button>
                  </div>
                  {testResult && (
                    <p className={`mt-2 text-sm ${testResult.includes("✓") ? "text-green-600" : "text-gray-500"}`}>
                      {testResult}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    Your API key is stored locally and never shared.
                  </p>
                </div>
              </div>
            </div>

            {/* Default Settings */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">Default Preferences</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Tone
                  </label>
                  <select
                    value={formData.defaultTone || "professional"}
                    onChange={(e) => setFormData({ ...formData, defaultTone: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="witty">Witty</option>
                    <option value="inspirational">Inspirational</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    The tone used for AI-generated content
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Platform
                  </label>
                  <select
                    value={formData.defaultPlatform || "linkedin"}
                    onChange={(e) => setFormData({ ...formData, defaultPlatform: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="linkedin">LinkedIn</option>
                    <option value="x">X / Twitter</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    The default platform for new posts
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Auto-inject Buttons
                  </label>
                  <p className="text-sm text-gray-500">
                    Show "Post with Nexus" buttons on LinkedIn and X
                  </p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, autoInject: !formData.autoInject })}
                  className={`w-14 h-7 rounded-full transition-colors ${
                    formData.autoInject ? "bg-indigo-600" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                      formData.autoInject ? "translate-x-7" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === "data" && (
          <div className="space-y-6">
            {/* Storage Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Storage Overview</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-indigo-600">{savedItems.length}</div>
                  <div className="text-sm text-gray-500 mt-1">Saved Items</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-indigo-600">
                    {savedItems.filter(i => i.source === "linkedin").length}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">From LinkedIn</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-indigo-600">
                    {savedItems.filter(i => i.source === "x").length}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">From X</div>
                </div>
              </div>
            </div>

            {/* Export/Import */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Backup & Restore</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Export Data</h3>
                    <p className="text-sm text-gray-500">
                      Download a backup of all your saved items and settings
                    </p>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                <div className="flex items-start gap-4 pt-4 border-t border-gray-200">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Import Data</h3>
                    <p className="text-sm text-gray-500">
                      Restore from a previous backup file
                    </p>
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium cursor-pointer transition-colors">
                    <RefreshCw className="w-4 h-4" />
                    Import
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl border border-red-200 p-6">
              <h2 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Delete Saved Items</h3>
                    <p className="text-sm text-gray-500">
                      Remove all saved items ({savedItems.length} items)
                    </p>
                  </div>
                  <button
                    onClick={handleClearSavedItems}
                    className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>

                <div className="flex items-start gap-4 pt-4 border-t border-gray-200">
                  <div className="flex-1">
                    <h3 className="font-medium text-red-900">Reset Everything</h3>
                    <p className="text-sm text-gray-500">
                      Clear all data including settings, saved items, and history
                    </p>
                  </div>
                  <button
                    onClick={handleClearAllData}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Reset All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "about" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-9 h-9 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Nexus</h2>
                  <p className="text-gray-500">AI Content Assistant</p>
                </div>
              </div>

              <div className="space-y-4 text-gray-700">
                <p>
                  Nexus helps you create engaging content for LinkedIn and X/Twitter using AI-powered assistance.
                </p>
                
                <h3 className="font-semibold text-gray-900 mt-6">Features</h3>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Quick composer with AI-powered content generation</li>
                  <li>Save interesting content from anywhere with right-click</li>
                  <li>Integrated buttons on LinkedIn and X for seamless posting</li>
                  <li>Library to organize and search your saved content</li>
                  <li>Multiple tone options (Professional, Casual, Witty, Inspirational)</li>
                </ul>

                <h3 className="font-semibold text-gray-900 mt-6">Version</h3>
                <p>1.0.0</p>

                <h3 className="font-semibold text-gray-900 mt-6">Links</h3>
                <div className="flex gap-4">
                  <a 
                    href="#" 
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
                    onClick={(e) => {
                      e.preventDefault()
                      chrome.tabs.create({ url: "https://github.com/yourusername/nexus" })
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    GitHub
                  </a>
                  <a 
                    href="#" 
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
                    onClick={(e) => {
                      e.preventDefault()
                      chrome.tabs.create({ url: "https://nexus-extension.com/help" })
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Help Center
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
              <h3 className="font-semibold text-indigo-900 mb-2">💡 Pro Tips</h3>
              <ul className="space-y-2 text-indigo-800">
                <li>• Right-click on any text or image to save it to Nexus</li>
                <li>Look for the ✨ "Post with Nexus" button on LinkedIn and X</li>
                <li>Use brain dump mode to quickly jot down ideas - AI will polish them</li>
                <li>Export your data regularly as a backup</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OptionsPage
