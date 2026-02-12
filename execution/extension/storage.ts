import { Storage } from "@plasmohq/storage"

// Storage key constants
export const STORAGE_KEYS = {
  SAVED_ITEMS: "nexus-saved-items",
  SETTINGS: "nexus-settings",
  COMPOSER_HISTORY: "nexus-composer-history"
} as const

// Types
export interface SavedItem {
  id: string
  type: "text" | "image" | "link"
  content: string
  url: string
  title: string
  source: "context_menu" | "linkedin" | "x" | "manual"
  createdAt: number
  tags: string[]
}

export interface Settings {
  apiKey: string
  defaultTone: "professional" | "casual" | "witty" | "inspirational"
  autoInject: boolean
  defaultPlatform: "linkedin" | "x"
}

export interface ComposerHistory {
  id: string
  originalText: string
  generatedText: string
  platform: "linkedin" | "x"
  tone: string
  createdAt: number
}

// Default settings
export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  defaultTone: "professional",
  autoInject: true,
  defaultPlatform: "linkedin"
}

// Initialize storage
const storage = new Storage({ area: "local" })

// Saved Items API
export const savedItemsApi = {
  async getAll(): Promise<SavedItem[]> {
    const items = await storage.get<SavedItem[]>(STORAGE_KEYS.SAVED_ITEMS)
    return items || []
  },

  async getById(id: string): Promise<SavedItem | null> {
    const items = await this.getAll()
    return items.find(item => item.id === id) || null
  },

  async add(item: Omit<SavedItem, "id" | "createdAt">): Promise<SavedItem> {
    const items = await this.getAll()
    const newItem: SavedItem = {
      ...item,
      id: generateId(),
      createdAt: Date.now()
    }
    await storage.set(STORAGE_KEYS.SAVED_ITEMS, [newItem, ...items])
    return newItem
  },

  async update(id: string, updates: Partial<SavedItem>): Promise<SavedItem | null> {
    const items = await this.getAll()
    const index = items.findIndex(item => item.id === id)
    if (index === -1) return null
    
    items[index] = { ...items[index], ...updates }
    await storage.set(STORAGE_KEYS.SAVED_ITEMS, items)
    return items[index]
  },

  async delete(id: string): Promise<boolean> {
    const items = await this.getAll()
    const filtered = items.filter(item => item.id !== id)
    await storage.set(STORAGE_KEYS.SAVED_ITEMS, filtered)
    return filtered.length < items.length
  },

  async search(query: string): Promise<SavedItem[]> {
    const items = await this.getAll()
    const lowerQuery = query.toLowerCase()
    return items.filter(item =>
      item.content.toLowerCase().includes(lowerQuery) ||
      item.title.toLowerCase().includes(lowerQuery) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  },

  async clear(): Promise<void> {
    await storage.remove(STORAGE_KEYS.SAVED_ITEMS)
  }
}

// Settings API
export const settingsApi = {
  async get(): Promise<Settings> {
    const settings = await storage.get<Settings>(STORAGE_KEYS.SETTINGS)
    return { ...DEFAULT_SETTINGS, ...settings }
  },

  async update(updates: Partial<Settings>): Promise<Settings> {
    const current = await this.get()
    const updated = { ...current, ...updates }
    await storage.set(STORAGE_KEYS.SETTINGS, updated)
    return updated
  },

  async reset(): Promise<void> {
    await storage.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
  }
}

// Composer History API
export const composerHistoryApi = {
  async getAll(): Promise<ComposerHistory[]> {
    const history = await storage.get<ComposerHistory[]>(STORAGE_KEYS.COMPOSER_HISTORY)
    return history || []
  },

  async add(entry: Omit<ComposerHistory, "id" | "createdAt">): Promise<ComposerHistory> {
    const history = await this.getAll()
    const newEntry: ComposerHistory = {
      ...entry,
      id: generateId(),
      createdAt: Date.now()
    }
    // Keep only last 50 entries
    const trimmed = [newEntry, ...history].slice(0, 50)
    await storage.set(STORAGE_KEYS.COMPOSER_HISTORY, trimmed)
    return newEntry
  },

  async clear(): Promise<void> {
    await storage.remove(STORAGE_KEYS.COMPOSER_HISTORY)
  }
}

// Utility function to generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Export storage instance for advanced use
export { storage }
