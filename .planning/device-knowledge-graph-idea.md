# Device Knowledge Graph — Idea Document

## What We're Building
An intelligent device scanner and knowledge graph feature for Second Brain that uses computer vision and AI to help people clean, organize, and understand their digital lives across phones and computers.

## The Problem
- Everyone's devices are a mess — thousands of photos, screenshots, downloads, forgotten apps
- "Storage full" is a constant nag on phones
- Existing tools (CleanMyMac, CCleaner, Google Files) are dumb — they find big files and caches but don't *understand* anything
- Nobody wants to manually sort 10,000 photos
- People lose valuable information buried in their device clutter

## The Solution
A Second Brain feature that:

1. **Scans devices** — catalogs files, photos, apps, downloads with metadata (size, type, last accessed, created date)
2. **Uses computer vision** — screenshot OCR, photo quality scoring (blurry detection), duplicate detection, content categorization
3. **Builds a knowledge graph** — maps relationships between files ("this PDF is related to that email", "these 12 screenshots are from the same research session")
4. **Makes smart recommendations** — "You have 3 copies of this receipt" / "These 200 screenshots are just memes you already posted" / "This app hasn't been opened in 9 months"
5. **Extracts knowledge** — turns device clutter into organized vault docs ("You took 47 screenshots of apartment listings last Tuesday" becomes an apartment hunting knowledge node)

## Strategy
- Build as a **Second Brain feature first** (vault integration, knowledge graph, search)
- Leverage existing Second Brain tooling: vault indexer, knowledge graph page, embeddings search, AI agent
- Once validated, **silo off as a standalone product**

## Existing Second Brain Infrastructure
- Next.js 15 + TypeScript + Tailwind (Vercel deployment)
- Vault system (markdown + JSON)
- Knowledge graph (`/graph` page)
- Search with Vertex AI embeddings + BigQuery
- `/ask` AI agent (Gemini reads all vault docs)
- Activity feed, task board
- 14 operational directives (DOE framework)
- Theme: dark green #154733, gold #FEE123, Material Symbols icons

## What New Pages/Features Are Needed
- `/devices` page — shows connected devices, storage breakdown, recommendations
- Device scanner agent (runs on Mac/iPhone, sends metadata to Second Brain)
- Computer vision pipeline (Gemini Vision or on-device CoreML)
- Cleanup recommendations engine
- Device sync API endpoint
- Knowledge extraction pipeline (device data → vault docs)

## Competition
- CleanMyMac ($40) — dumb file size scanner
- Google Files — basic cleanup suggestions
- Nothing combines vision + knowledge graphs + intelligent organization

## Target User
- Anyone with a messy phone/computer who wants AI to understand and organize their digital life
- Privacy-conscious users (on-device processing, nothing leaves your phone)

## Tech Considerations
- On-device scanning agent (Swift for iOS/Mac, or Electron for cross-platform)
- Computer vision: Gemini Vision API for analysis, on-device CoreML for speed
- Sync protocol: device pushes scan results to Second Brain API
- Privacy-first: raw files never leave device, only metadata + AI-extracted knowledge
