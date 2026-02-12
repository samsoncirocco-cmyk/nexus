# Nexus Chrome Extension

AI-powered content assistant for LinkedIn and X/Twitter.

## Features

- ✨ **Quick Composer** - Brain dump your thoughts, let AI polish them into engaging posts
- 💾 **Save Anything** - Right-click to save text, images, and links
- 🚀 **Platform Integration** - "Post with Nexus" buttons on LinkedIn and X
- 📚 **Content Library** - Organize and search your saved content
- 🎨 **Multiple Tones** - Professional, Casual, Witty, or Inspirational

## Installation

### From Source (Development)

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development mode:
   ```bash
   npm run dev
   ```
4. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-dev` folder

### Production Build

```bash
npm run build
```

This creates a production build in `.plasmo/build/chrome-mv3-prod/`

### Package for Chrome Web Store

```bash
npm run package
```

This creates `nexus-extension.x.x.x.zip` ready for upload.

## Project Structure

```
extension/
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── manifest.json         # Extension manifest (template)
├── popup.tsx             # Main popup UI
├── content.tsx           # Content scripts for web pages
├── background.ts         # Service worker
├── options.tsx           # Settings page
├── storage.ts            # Local storage wrapper
└── style.css             # Shared styles
```

## Development

### Tech Stack

- **Framework**: [Plasmo](https://www.plasmo.com/) - Modern browser extension framework
- **UI**: React + TypeScript
- **Styling**: Tailwind CSS (via Plasmo)
- **Icons**: Lucide React
- **Storage**: Plasmo Storage API

### Key Files

| File | Purpose |
|------|---------|
| `popup.tsx` | Main extension popup - compose, saved items, quick settings |
| `content.tsx` | Injected into LinkedIn/X - adds "Post with Nexus" buttons |
| `background.ts` | Service worker - context menus, message handling, AI generation |
| `options.tsx` | Full settings page - API config, data export, about |
| `storage.ts` | Type-safe storage wrapper for Chrome storage API |

### Adding AI Integration

The extension includes a placeholder AI generation function. To connect to a real AI service:

1. Edit `background.ts`
2. Replace the `generateWithAI` function with your API call:

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

## Permissions

The extension requires these permissions:

- `storage` - Save your content and settings locally
- `contextMenus` - Right-click "Save to Nexus" menu
- `activeTab` - Interact with the current page
- `scripting` - Inject buttons on LinkedIn/X
- `notifications` - Show save confirmations

Host permissions for:
- `https://www.linkedin.com/*`
- `https://x.com/*`
- `https://twitter.com/*`

## Browser Support

- Chrome 88+ (Manifest V3)
- Edge 88+ (Chromium-based)
- Other Chromium-based browsers supporting Manifest V3

## Icons

Place icon files in `assets/`:
- `icon16.png` - Toolbar icon
- `icon32.png` - Toolbar retina
- `icon48.png` - Extensions page
- `icon128.png` - Chrome Web Store

## License

MIT

## Support

For issues and feature requests, please visit:
https://github.com/yourusername/nexus-extension/issues
