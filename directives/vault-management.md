# Directive: Vault Management

## Goal
Create, update, and organize markdown documents in the knowledge vault

## When to Use
- Adding new accounts, concepts, projects, or journal entries
- Updating existing vault documents with new information
- Organizing and categorizing knowledge
- Rebuilding the vault index for search

## Prerequisites
- Access to `/home/samson/.openclaw/workspace/projects/second-brain/vault/`
- Understanding of YAML frontmatter format
- Text editor or file manipulation tools

## Steps

### Creating a New Document

1. **Choose the category** based on content type:
   - `accounts/` — CRM-style account profiles (schools, companies, agencies)
   - `concepts/` — Knowledge articles, frameworks, playbooks
   - `journal/` — Daily notes and reflections
   - `projects/` — Project documentation and status
   - `erate/` — E-Rate leads and research
   - `intel/` — Competitive intelligence and market research
   - `marketing/` — Marketing content and campaigns
   - `reports/` — Generated reports and analysis

2. **Create the file** with a descriptive slug:
   ```bash
   cd /home/samson/.openclaw/workspace/projects/second-brain/vault
   
   # Example: New account
   touch accounts/ohsu.md
   
   # Example: New concept
   touch concepts/sales-methodology.md
   
   # Example: Daily journal
   touch journal/2026-02-08.md
   ```

3. **Add YAML frontmatter** (required for proper indexing):
   ```yaml
   ---
   title: "Oregon Health Sciences University"
   date: 2026-02-08
   tags: [account, healthcare, oregon, portland]
   description: "Account profile for OHSU - Oregon's largest academic medical center"
   ---
   ```

4. **Write the content** in Markdown:
   ```markdown
   # OHSU Overview
   
   Oregon Health & Science University is the state's only academic health center.
   
   ## Key Facts
   - Students: 3,000+
   - Employees: 18,000+
   - Budget: $3.8B annually
   
   ## Contacts
   - **CIO**: Jane Smith (jane.smith@ohsu.edu)
   - **IT Director**: Bob Johnson
   
   ## Opportunities
   - Network upgrade project (Q3 2026)
   - Security assessment needed
   ```

5. **Save and verify**:
   ```bash
   cat accounts/ohsu.md  # Verify content
   ```

### Updating an Existing Document

1. **Find the document**:
   ```bash
   cd vault
   find . -name "*ohsu*"  # Search by keyword
   # or
   grep -r "OHSU" .  # Full-text search
   ```

2. **Edit the file**:
   ```bash
   nano accounts/ohsu.md  # or use your preferred editor
   ```

3. **Update frontmatter if needed**:
   - Add new tags
   - Update the date
   - Revise the description

4. **Commit changes** (if tracked in git):
   ```bash
   git add vault/accounts/ohsu.md
   git commit -m "docs: update OHSU account with new contact"
   git push origin main
   ```

### Rebuilding the Index

The vault index is rebuilt automatically when the app restarts, but you can force a rebuild:

1. **Trigger via search** — Any search query rebuilds the index
   ```bash
   curl http://localhost:3000/api/search?q=test
   ```

2. **Restart the dev server**:
   ```bash
   # Ctrl+C to stop
   npm run dev  # Restart
   ```

3. **Verify index** in browser:
   - Go to `/search`
   - Search for a known term
   - Should return relevant docs

### Mass Operations

#### List all documents
```bash
cd vault
find . -name "*.md" -type f | sort
```

#### Count documents by category
```bash
for dir in accounts concepts journal projects erate intel marketing reports; do
  echo "$dir: $(find $dir -name "*.md" 2>/dev/null | wc -l)"
done
```

#### Search across all documents
```bash
grep -r "keyword" . --include="*.md"
```

#### Bulk tag update (advanced)
```bash
# Add a tag to all files in a category
cd vault/accounts
for file in *.md; do
  # Insert 'accounts' tag if not present
  sed -i '/^tags:/s/\[/[accounts, /' "$file"
done
```

## Expected Output

### New Document Created
```
vault/accounts/ohsu.md

✓ Valid YAML frontmatter
✓ Markdown content formatted
✓ Searchable via /api/search
✓ Appears in /doc/accounts/ohsu
```

### Updated Document
```
✓ Changes saved to disk
✓ Index will rebuild on next search
✓ Changes visible immediately in doc viewer
```

### Vault Statistics
```
Total documents: 50+
├── accounts: 8
├── concepts: 12
├── journal: 15
├── projects: 7
├── erate: 4
├── intel: 2
├── marketing: 1
└── reports: 2
```

## Edge Cases

### Missing Frontmatter
**Problem**: Document doesn't show up in search or navigation

**Solution**: Add minimal frontmatter:
```yaml
---
title: "Document Title"
date: 2026-02-08
tags: [general]
description: "Brief description"
---
```

### Invalid YAML Syntax
**Problem**: Parsing error when loading document

**Solution**: Validate YAML syntax
- Use quotes around values with special characters
- Check for proper indentation (2 spaces)
- Ensure no tabs in YAML section

Example fix:
```yaml
# BAD
tags: [accounts, oregon:portland]  # Colon breaks parsing

# GOOD
tags: [accounts, "oregon:portland"]
```

### Duplicate Slugs
**Problem**: Two files with same name in different categories

**Behavior**: Both are accessible, but URL routing uses full path:
- `/doc/accounts/contact.md`
- `/doc/concepts/contact.md`

**Best Practice**: Use descriptive unique names even within categories

### Large Document Performance
**Problem**: Document > 100KB slows down search indexing

**Solution**:
- Split into multiple smaller documents
- Link between them using relative paths: `[See also](./related-doc.md)`
- Use document collections with an index file

### Stale Index After Vault Update
**Problem**: Search doesn't find newly added documents

**Solution**: Index rebuilds on:
1. First search query after app restart
2. Any API call to `/api/search`
3. Server restart

Force rebuild: `curl http://localhost:3000/api/search?q=_rebuild`

## Cost
- **Time**: 2-5 minutes per document
- **Storage**: ~5-50 KB per markdown file (negligible)
- **Index Rebuild**: ~100-500ms for 50 documents

---

**Related Directives**:
- `knowledge-graph.md` — Visualize document relationships
- `ai-ask.md` — Query vault with natural language
- `deploy-vercel.md` — Deploy vault updates to production
