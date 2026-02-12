import type { PlasmoCSConfig } from "plasmo"
import { settingsApi, savedItemsApi } from "./storage"

// Content script configuration
export const config: PlasmoCSConfig = {
  matches: [
    "https://www.linkedin.com/*",
    "https://x.com/*",
    "https://twitter.com/*"
  ],
  all_frames: false,
  run_at: "document_idle"
}

// Platform detection
function detectPlatform(): "linkedin" | "x" | null {
  const url = window.location.href
  if (url.includes("linkedin.com")) return "linkedin"
  if (url.includes("x.com") || url.includes("twitter.com")) return "x"
  return null
}

// Create Nexus button element
function createNexusButton(platform: "linkedin" | "x"): HTMLButtonElement {
  const button = document.createElement("button")
  button.className = `nexus-inject-btn nexus-${platform}`
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
    <span>Post with Nexus</span>
  `
  
  button.addEventListener("click", async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Find the compose textarea
    const textarea = findComposeTextarea(platform)
    if (textarea) {
      const existingText = textarea.value || ""
      
      // Open popup with pre-filled content
      chrome.runtime.sendMessage({
        action: "openComposer",
        platform,
        initialText: existingText
      })
    }
  })
  
  return button
}

// Find compose textarea based on platform
function findComposeTextarea(platform: "linkedin" | "x"): HTMLTextAreaElement | null {
  if (platform === "linkedin") {
    // LinkedIn compose selectors
    const selectors = [
      "[data-testid="editor-contenteditable"][contenteditable]",
      ".ql-editor[contenteditable]",
      "[role="textbox"][contenteditable]",
      "[aria-label*="Write post"][contenteditable]",
      "[data-artdeco-is-focused] .ql-editor"
    ]
    
    for (const selector of selectors) {
      const el = document.querySelector(selector) as HTMLElement
      if (el) {
        // Return the actual contenteditable element
        return el as HTMLTextAreaElement
      }
    }
  } else {
    // X/Twitter compose selectors
    const selectors = [
      "[data-testid="tweetTextarea_0"]",
      "[data-testid="tweetTextarea_0"] [contenteditable]",
      "[aria-label="Post text"]",
      "[contenteditable][data-text="true"]"
    ]
    
    for (const selector of selectors) {
      const el = document.querySelector(selector) as HTMLElement
      if (el) {
        return el as HTMLTextAreaElement
      }
    }
  }
  
  return null
}

// Inject button into LinkedIn compose area
function injectLinkedInButton(): void {
  // Check if settings allow injection
  settingsApi.get().then(settings => {
    if (!settings.autoInject) return
    
    // Find compose containers
    const composeAreas = document.querySelectorAll([
      "[data-testid="share-creation-state"]",
      ".share-box",
      "[role="dialog"] .ql-container",
      ".artdeco-modal__content .ql-container"
    ].join(", "))
    
    composeAreas.forEach(container => {
      // Check if button already injected
      if (container.querySelector(".nexus-inject-btn")) return
      
      // Find the toolbar or button row
      const toolbar = container.querySelector([
        "[data-testid="share-actions"]",
        ".share-actions",
        "[class*="toolbar"]",
        ".ql-toolbar"
      ].join(", "))
      
      if (toolbar) {
        const button = createNexusButton("linkedin")
        button.classList.add("nexus-linkedin-style")
        toolbar.appendChild(button)
      }
    })
  })
}

// Inject button into X/Twitter compose area
function injectXButton(): void {
  // Check if settings allow injection
  settingsApi.get().then(settings => {
    if (!settings.autoInject) return
    
    // Find compose areas
    const composeAreas = document.querySelectorAll([
      "[data-testid="tweetButtonInline"]",
      "[data-testid="tweetButton"]",
      "[data-testid="tweetComposer"]"
    ].join(", "))
    
    composeAreas.forEach(button => {
      const container = button.closest("[role="group"], [class*="actions"], [data-testid="toolBar]")
      if (!container) return
      
      // Check if button already injected
      if (container.querySelector(".nexus-inject-btn")) return
      
      const nexusBtn = createNexusButton("x")
      nexusBtn.classList.add("nexus-x-style")
      container.insertBefore(nexusBtn, button)
    })
  })
}

// Inject styles
function injectStyles(): void {
  if (document.getElementById("nexus-inject-styles")) return
  
  const style = document.createElement("style")
  style.id = "nexus-inject-styles"
  style.textContent = `
    .nexus-inject-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: none;
      border-radius: 16px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-left: 8px;
    }
    
    .nexus-linkedin {
      background: linear-gradient(135deg, #0a66c2, #0077b5);
      color: white;
    }
    
    .nexus-linkedin:hover {
      background: linear-gradient(135deg, #004182, #005885);
      transform: translateY(-1px);
    }
    
    .nexus-x {
      background: #000;
      color: white;
    }
    
    .nexus-x:hover {
      background: #1a1a1a;
      transform: translateY(-1px);
    }
    
    .nexus-inject-btn svg {
      flex-shrink: 0;
    }
    
    /* LinkedIn specific styling */
    .nexus-linkedin-style {
      height: 32px;
    }
    
    /* X specific styling */
    .nexus-x-style {
      height: 36px;
    }
  `
  document.head.appendChild(style)
}

// Save current page content
async function saveCurrentPage(): Promise<void> {
  const platform = detectPlatform()
  if (!platform) return
  
  const url = window.location.href
  const title = document.title
  
  // Try to get selected text or page description
  const selection = window.getSelection()?.toString()
  const description = document.querySelector('meta[name="description"]')?.getAttribute("content")
  
  const content = selection || description || title
  
  await savedItemsApi.add({
    type: "text",
    content: content.substring(0, 2000),
    url,
    title,
    source: platform,
    tags: []
  })
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "savePageContent") {
    saveCurrentPage().then(() => {
      sendResponse({ success: true })
    }).catch(err => {
      sendResponse({ success: false, error: err.message })
    })
    return true // Keep channel open for async
  }
})

// Main initialization
function init(): void {
  const platform = detectPlatform()
  if (!platform) return
  
  injectStyles()
  
  // Initial injection
  if (platform === "linkedin") {
    injectLinkedInButton()
  } else {
    injectXButton()
  }
  
  // Watch for dynamic content changes
  const observer = new MutationObserver((mutations) => {
    let shouldInject = false
    
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            // Check if node or its children contain compose areas
            if (node.matches?.('[data-testid="share-creation-state"], [data-testid="tweetComposer"]') ||
                node.querySelector?.('[data-testid="share-creation-state"], [data-testid="tweetComposer"]')) {
              shouldInject = true
              break
            }
          }
        }
      }
      if (shouldInject) break
    }
    
    if (shouldInject) {
      if (platform === "linkedin") {
        injectLinkedInButton()
      } else {
        injectXButton()
      }
    }
  })
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

// Run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}
