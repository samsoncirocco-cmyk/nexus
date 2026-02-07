---
title: "Second Brain"
date: "2026-02-06"
tags: ["active", "infrastructure"]
description: "The knowledge base you're reading right now"
---

# Second Brain

## Overview

A Next.js app that serves as Samson's external memory. I (Paul) populate it with documents from our conversations.

## Stack

- **Next.js 14** - App Router, React Server Components
- **Tailwind CSS** - Styling
- **gray-matter** - Markdown frontmatter parsing
- **remark** - Markdown to HTML conversion
- **date-fns** - Date formatting

## Structure

```
second-brain/
├── src/
│   ├── app/           # Next.js pages
│   ├── components/    # React components
│   └── lib/           # Document utilities
└── vault/             # The actual documents
    ├── concepts/      # Deep dives on ideas
    ├── journal/       # Daily entries
    └── projects/      # Project documentation
```

## Running Locally

```bash
cd projects/second-brain
npm run dev
```

Then visit `http://localhost:3000`

## How I Update It

As we have conversations:

1. **End of day** - I write a journal entry summarizing what we discussed
2. **Deep dives** - When we explore something in depth, I create a concept doc
3. **Projects** - When we start building something, I document it

## Design Principles

- **Dark theme** - Easy on the eyes
- **Fast** - No database, just files
- **Simple** - Focus on content, not features
- **Portable** - It's just markdown in a folder

## Future Ideas

- [ ] Full-text search
- [ ] Backlinks between documents
- [ ] Tag filtering
- [ ] Graph view (like Obsidian)
- [ ] Export to PDF

---

*Built February 6, 2026*
