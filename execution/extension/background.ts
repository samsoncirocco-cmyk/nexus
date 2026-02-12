import { savedItemsApi, settingsApi } from "./storage"

// Background script entry point for Plasmo
export {}

// Context menu IDs
const CONTEXT_MENU_ID = "nexus-save-selection"

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Nexus extension installed:", details.reason)
  
  // Create context menu
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Save to Nexus",
    contexts: ["selection", "image", "link"],
    documentUrlPatterns: ["<all_urls>"]
  })
  
  // Set default settings on first install
  if (details.reason === "install") {
    settingsApi.get().then(settings => {
      console.log("Default settings initialized:", settings)
    })
  }
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return
  
  if (!tab?.id) return
  
  try {
    let content = ""
    let type: "text" | "image" | "link" = "text"
    
    if (info.selectionText) {
      // Text selection
      content = info.selectionText
      type = "text"
    } else if (info.srcUrl) {
      // Image
      content = info.srcUrl
      type = "image"
    } else if (info.linkUrl) {
      // Link
      content = info.linkUrl
      type = "link"
    }
    
    // Get page info
    const url = tab.url || ""
    const title = tab.title || "Untitled"
    
    // Detect source platform
    let source: "context_menu" | "linkedin" | "x" | "manual" = "context_menu"
    if (url.includes("linkedin.com")) source = "linkedin"
    else if (url.includes("x.com") || url.includes("twitter.com")) source = "x"
    
    // Save to storage
    const savedItem = await savedItemsApi.add({
      type,
      content,
      url,
      title,
      source,
      tags: []
    })
    
    console.log("Saved to Nexus:", savedItem)
    
    // Show notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "assets/icon48.png",
      title: "Saved to Nexus",
      message: type === "text" 
        ? `Saved "${content.substring(0, 50)}${content.length > 50 ? "..." : ""}"`
        : `Saved ${type} from ${title}`
    })
    
  } catch (error) {
    console.error("Error saving to Nexus:", error)
    
    chrome.notifications.create({
      type: "basic",
      iconUrl: "assets/icon48.png",
      title: "Failed to Save",
      message: "Could not save content to Nexus. Please try again."
    })
  }
})

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message)
  
  switch (message.action) {
    case "openComposer":
      // Open popup with pre-filled content
      chrome.action.openPopup().then(() => {
        // Store the initial text temporarily
        chrome.storage.local.set({
          "nexus-composer-draft": {
            platform: message.platform,
            initialText: message.initialText,
            timestamp: Date.now()
          }
        })
        sendResponse({ success: true })
      }).catch(err => {
        console.error("Error opening popup:", err)
        sendResponse({ success: false, error: err.message })
      })
      return true // Keep channel open for async
      
    case "getSavedItems":
      savedItemsApi.getAll().then(items => {
        sendResponse({ success: true, items })
      }).catch(err => {
        sendResponse({ success: false, error: err.message })
      })
      return true
      
    case "saveItem":
      savedItemsApi.add(message.item).then(item => {
        sendResponse({ success: true, item })
      }).catch(err => {
        sendResponse({ success: false, error: err.message })
      })
      return true
      
    case "deleteItem":
      savedItemsApi.delete(message.id).then(success => {
        sendResponse({ success })
      }).catch(err => {
        sendResponse({ success: false, error: err.message })
      })
      return true
      
    case "getSettings":
      settingsApi.get().then(settings => {
        sendResponse({ success: true, settings })
      }).catch(err => {
        sendResponse({ success: false, error: err.message })
      })
      return true
      
    case "updateSettings":
      settingsApi.update(message.settings).then(settings => {
        sendResponse({ success: true, settings })
      }).catch(err => {
        sendResponse({ success: false, error: err.message })
      })
      return true
      
    case "generateContent":
      // This would connect to your AI service
      // For now, we'll just acknowledge
      generateWithAI(message.text, message.platform, message.tone)
        .then(content => {
          sendResponse({ success: true, content })
        })
        .catch(err => {
          sendResponse({ success: false, error: err.message })
        })
      return true
      
    default:
      sendResponse({ success: false, error: "Unknown action" })
      return false
  }
})

// AI content generation helper
async function generateWithAI(
  text: string, 
  platform: "linkedin" | "x", 
  tone: string
): Promise<string> {
  const settings = await settingsApi.get()
  
  if (!settings.apiKey) {
    throw new Error("API key not configured. Please add your API key in settings.")
  }
  
  // TODO: Replace with actual AI API call
  // This is a placeholder that simulates AI generation
  const maxLength = platform === "x" ? 280 : 3000
  
  // In production, you would call your AI service here:
  // const response = await fetch('your-ai-api-endpoint', {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${settings.apiKey}` },
  //   body: JSON.stringify({ text, platform, tone })
  // })
  
  // Simulated response
  const templates: Record<string, string[]> = {
    professional: [
      `Excited to share: ${text.substring(0, 100)}... This represents an important development in our field. Would love your thoughts.`,
      `Recent observations: ${text.substring(0, 80)}... Key takeaway - focus on what matters most.`,
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
  
  return template.length > maxLength 
    ? template.substring(0, maxLength - 3) + "..."
    : template
}

// Handle tab updates - inject content scripts if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    // Check if we're on a supported platform
    const isLinkedIn = tab.url.includes("linkedin.com")
    const isX = tab.url.includes("x.com") || tab.url.includes("twitter.com")
    
    if (isLinkedIn || isX) {
      // Content script will auto-inject via Plasmo's matches pattern
      // But we can do additional setup here if needed
      console.log(`Nexus active on ${isLinkedIn ? "LinkedIn" : "X"}`)
    }
  }
})

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  // The popup will open automatically
  // This is just for additional handling if needed
  console.log("Nexus icon clicked on tab:", tab.id)
})

// Alarm for periodic tasks (if needed)
chrome.alarms?.onAlarm?.addListener((alarm) => {
  if (alarm.name === "nexus-cleanup") {
    // Clean up old items or perform maintenance
    console.log("Running Nexus maintenance...")
  }
})
