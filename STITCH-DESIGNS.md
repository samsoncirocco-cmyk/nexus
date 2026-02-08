# Stitch Design Integration Brief

## Theme (Tailwind Config)
```js
colors: {
  "primary": "#fade29",       // Gold
  "background-light": "#f8f8f5",
  "background-dark": "#0a0f0c", // Deep Space Green
  "secondary-dark": "#154733",  // Muted Forest
}
fontFamily: {
  "display": ["Space Grotesk", "sans-serif"]
}
```

## Design Files (HTML with Tailwind)
All at `/home/samson/stitch-designs/`:
- `home-screen.html` — Dashboard with greeting, stat cards, activity feed, bottom nav
- `activity-screen.html` — Timeline activity feed with agent badges
- `deals-screen.html` — Kanban sales pipeline with territory filters
- `docviewer-screen.html` — Markdown doc viewer with folder tree sidebar

## Data Sources (already exist)
- `vault/tasks.json` — Task board data
- `vault/activity.json` — Activity feed entries
- `vault/` directory — All markdown documents organized by folder

## Requirements
1. Extract the Tailwind design patterns from each HTML file
2. Convert to Next.js 16 components (app router, server components where possible)
3. Keep existing API routes (`/api/activity`)
4. Wire up real data from vault/ JSON files and markdown docs
5. Dark theme only (no light mode toggle needed)
6. Mobile-first, responsive
7. Space Grotesk font from Google Fonts
8. Deploy command: `npx vercel --token $VERCEL_TOKEN --scope team_J8oAAeW3ck0OxWkCMRALUdTE --prod --yes`

## Pages to Build
- `/` — Home dashboard (home-screen.html)
- `/tasks` — Task board (use existing tasks.json)
- `/activity` — Activity feed (activity-screen.html + activity.json)
- `/deals` — Deals pipeline (deals-screen.html)
- `/doc/[...slug]` — Doc viewer (docviewer-screen.html + vault markdown)
