# Nexus Chrome Extension - Complete Implementation

## 📁 Project Structure

```
/Users/maryobrien/second-brain/
├── directives/
│   └── chrome_extension.md       # Complete development directive
└── execution/
    └── extension/
        ├── package.json           # Dependencies & scripts
        ├── tsconfig.json          # TypeScript config
        ├── manifest.json          # Chrome extension manifest
        ├── .gitignore             # Git ignore rules
        ├── README.md              # Project documentation
        ├── popup.tsx              # Main popup UI (compose, saved, settings)
        ├── content.tsx            # Content scripts for LinkedIn/X injection
        ├── background.ts          # Service worker (context menus, AI)
        ├── options.tsx            # Full settings page
        ├── storage.ts             # Type-safe storage wrapper
        ├── style.css              # Shared styles
        └── assets/
            ├── icon.svg             # Source icon
            └── README.md            # Icon generation guide
```

## ✅ Implemented Features

### 1. Context Menu - "Save to Nexus"
- Right-click any selected text, image, or link
- Saves with metadata (URL, title, timestamp, source)
- Shows notification confirmation
- Located in `background.ts`

### 2. Quick Composer Popup
- Brain dump input area
- Platform toggle (LinkedIn/X)
- AI-powered content generation (placeholder)
- Character counter with limits (280 for X, 3000 for LinkedIn)
- Copy to clipboard
- Open platform in new tab
- Located in `popup.tsx` (Compose tab)

### 3. Platform Integration Buttons
- Injects "Post with Nexus" buttons on LinkedIn compose areas
- Injects "Post with Nexus" buttons on X compose areas
- Respects auto-inject setting
- Opens popup with pre-filled content
- Located in `content.tsx`

### 4. Saved Content Library
- Browse all saved items
- Shows source platform and date
- Copy individual items
- Delete items
- Search functionality (in storage API)
- Located in `popup.tsx` (Saved tab)

### 5. Settings Page
- API key configuration with test button
- Default tone selection (Professional, Casual, Witty, Inspirational)
- Default platform selection
- Auto-inject toggle
- Data export/import (JSON)
- Storage statistics
- Clear data options
- Located in `options.tsx`

## 🚀 Getting Started

### Installation

```bash
cd /Users/maryobrien/second-brain/execution/extension
npm install
```

### Development

```bash
npm run dev
```

Load the unpacked extension from `.plasmo/build/chrome-mv3-dev/`

### Production Build

```bash
npm run build
```

### Package for Chrome Web Store

```bash
npm run package
```

## 🔧 Connecting AI Service

To connect a real AI service, update the `generateWithAI` function in `background.ts`:

```typescript
async function generateWithAI(text: string, platform: "linkedin" | "x", tone: string) {
  const settings = await settingsApi.get()
  
  const response = await fetch('https://your-ai-api.com/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, platform, tone })
  })
  
  const data = await response.json()
  return data.generatedContent
}
```

## 📋 Required Icons

Before publishing to Chrome Web Store, generate PNG icons from `assets/icon.svg`:

```bash
cd assets
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 32x32 icon32.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

## 🔐 Permissions Summary

| Permission | Purpose |
|------------|---------|
| `storage` | Save content and settings locally |
| `contextMenus` | Right-click "Save to Nexus" menu |
| `activeTab` | Interact with current page |
| `scripting` | Inject buttons on LinkedIn/X |
| `notifications` | Show save confirmations |

## 📝 Notes

- Extension uses Manifest V3 (required for Chrome Web Store as of 2024)
- Plasmo framework handles hot reloading and automatic manifest generation
- Storage is local-only (no cloud sync)
- All data stays on the user's device
- Extension is ready for Chrome Web Store submission once icons are added
