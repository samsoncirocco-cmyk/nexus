import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import { 
  Sparkles, 
  Save, 
  Settings, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Check,
  MessageSquare,
  Linkedin,
  Twitter,
  Plus
} from "lucide-react"
import { savedItemsApi, composerHistoryApi, settingsApi, type SavedItem, type Settings } from "./storage"
import "./style.css"

// Tab types
type Tab = "compose" | "saved" | "settings"

// Generate content using AI (placeholder - replace with actual API call)
async function generateContent(text: string, platform: "linkedin" | "x", tone: string): Promise<string> {
  // This is a placeholder - in production, call your AI API
  const maxLength = platform === "x" ? 280 : 3000
  const platformName = platform === "x" ? "X/Twitter" : "LinkedIn"
  
  // Simulated AI response
  const templates: Record<string, string[]> = {
    professional: [
      `Excited to share: ${text.substring(0, 100)}... This represents an important development in our field. Would love your thoughts.`,
      `Recent observations: ${text.substring(0, 80)}... Key takeaway - focus on what matters most. #professional`,
      `Building in public: ${text.substring(0, 90)}... The journey continues. What's your experience?`
    ],
    casual: [
      `Just thinking about ${text.substring(0, 60)}... Kind of wild when you really look at it!`,
      `Random thought: ${text.substring(0, 80)}... Anyone else feel this way? 🤔`,
      `${text.substring(0, 70)}... That's it, that's the tweet.`
    ],
    witty: [
      `${text.substring(0, 50)}... *insert clever observation here* (I'm basically a philosopher now)`,
      `Plot twist: ${text.substring(0, 70)}... Didn't see that coming, did you?`,
      `Hot take incoming 🔥 ${text.substring(0, 60)}... Discuss.`
    ],
    inspirational: [
      `Remember: ${text.substring(0, 80)}... Your potential is limitless. Keep pushing forward. ✨`,
      `Growth happens when ${text.substring(0, 70)}... Believe in yourself and keep going.`,
      `Today's reminder: ${text.substring(0, 75)}... You have everything you need within you.`
    ]
  }

  const options = templates[tone] || templates.professional
  const template = options[Math.floor(Math.random() * options.length)]
  
  // Ensure length constraints
  return template.length > maxLength 
    ? template.substring(0, maxLength - 3) + "..."
    : template
}

function IndexPopup() {
  // State
  const [activeTab, setActiveTab] = useState<Tab>("compose")
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Compose state
  const [brainDump, setBrainDump] = useState("")
  const [platform, setPlatform] = useState<"linkedin" | "x">("linkedin")
  const [generatedContent, setGeneratedContent] = useState("")
  const [copied, setCopied] = useState(false)

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  // Listen for storage changes
  useEffect(() => {
    const storage = new Storage({ area: "local" })
    const unsubscribe = storage.watch({
      "nexus-saved-items": () => loadSavedItems()
    })
    return () => unsubscribe()
  }, [])

  async function loadData() {
    await Promise.all([loadSavedItems(), loadSettings()])
  }

  async function loadSavedItems() {
    const items = await savedItemsApi.getAll()
    setSavedItems(items)
  }

  async function loadSettings() {
    const s = await settingsApi.get()
    setSettings(s)
    setPlatform(s.defaultPlatform)
  }

  async function handleGenerate() {
    if (!brainDump.trim()) return
    
    setIsLoading(true)
    try {
      const s = await settingsApi.get()
      const content = await generateContent(brainDump, platform, s.defaultTone)
      setGeneratedContent(content)
      
      // Save to history
      await composerHistoryApi.add({
        originalText: brainDump,
        generatedText: content,
        platform,
        tone: s.defaultTone
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handlePost() {
    const url = platform === "x" 
      ? "https://x.com/compose/post"
      : "https://www.linkedin.com/post/new"
    await chrome.tabs.create({ url })
  }

  async function handleDeleteItem(id: string) {
    await savedItemsApi.delete(id)
    await loadSavedItems()
  }

  async function handleUpdateSettings(newSettings: Partial<Settings>) {
    const updated = await settingsApi.update(newSettings)
    setSettings(updated)
  }

  const maxChars = platform === "x" ? 280 : 3000
  const charCount = generatedContent.length
  const charColor = charCount > maxChars ? "text-red-500" : "text-gray-500"

  return (
    <div className="w-[400px] min-h-[500px] bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            <h1 className="text-lg font-bold">Nexus</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("compose")}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === "compose" ? "bg-white/20" : "hover:bg-white/10"
              }`}
              title="Compose"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === "saved" ? "bg-white/20" : "hover:bg-white/10"
              }`}
              title="Saved Items"
            >
              <Save className="w-4 h-4" />
              {savedItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {savedItems.length > 9 ? "9+" : savedItems.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === "settings" ? "bg-white/20" : "hover:bg-white/10"
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "compose" && (
          <div className="space-y-4">
            {/* Platform Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPlatform("linkedin")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  platform === "linkedin"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </button>
              <button
                onClick={() => setPlatform("x")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  platform === "x"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Twitter className="w-4 h-4" />
                X
              </button>
            </div>

            {/* Brain Dump Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brain Dump
              </label>
              <textarea
                value={brainDump}
                onChange={(e) => setBrainDump(e.target.value)}
                placeholder="Dump your thoughts here... I'll polish them into a great post!"
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!brainDump.trim() || isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate {platform === "x" ? "Tweet" : "Post"}
                </>
              )}
            </button>

            {/* Generated Content */}
            {generatedContent && (
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {generatedContent}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-xs ${charColor}`}>
                      {charCount} / {maxChars}
                    </span>
                    {charCount > maxChars && (
                      <span className="text-xs text-red-500">
                        Over limit by {charCount - maxChars} characters
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={handlePost}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open {platform === "x" ? "X" : "LinkedIn"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div className="space-y-3">
            {savedItems.length === 0 ? (
              <div className="text-center py-12">
                <Save className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No saved items yet</p>
                <p className="text-gray-400 text-xs mt-1">
                  Right-click on any page to save content
                </p>
              </div>
            ) : (
              savedItems.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 line-clamp-3">
                        {item.content}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <span className="capitalize bg-gray-100 px-2 py-0.5 rounded">
                          {item.source}
                        </span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => navigator.clipboard.writeText(item.content)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "settings" && settings && (
          <div className="space-y-6">
            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => handleUpdateSettings({ apiKey: e.target.value })}
                placeholder="Enter your API key"
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for AI-powered content generation
              </p>
            </div>

            {/* Default Tone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Tone
              </label>
              <select
                value={settings.defaultTone}
                onChange={(e) => handleUpdateSettings({ defaultTone: e.target.value as any })}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="witty">Witty</option>
                <option value="inspirational">Inspirational</option>
              </select>
            </div>

            {/* Default Platform */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Platform
              </label>
              <select
                value={settings.defaultPlatform}
                onChange={(e) => handleUpdateSettings({ defaultPlatform: e.target.value as any })}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="linkedin">LinkedIn</option>
                <option value="x">X / Twitter</option>
              </select>
            </div>

            {/* Auto Inject */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Auto-inject Buttons
                </label>
                <p className="text-xs text-gray-500">
                  Show "Post with Nexus" buttons on LinkedIn and X
                </p>
              </div>
              <button
                onClick={() => handleUpdateSettings({ autoInject: !settings.autoInject })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.autoInject ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    settings.autoInject ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Clear Data */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={async () => {
                  if (confirm("Are you sure? This will delete all saved items.")) {
                    await savedItemsApi.clear()
                    await loadSavedItems()
                  }
                }}
                className="text-red-600 text-sm hover:text-red-700"
              >
                Clear all saved items
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default IndexPopup
