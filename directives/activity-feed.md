# Directive: Activity Feed

## Goal
Post events to the real-time activity feed that appears on the dashboard

## When to Use
- Agent completes a task
- User takes an action (create task, update deal, research account)
- System event occurs (deploy, backup, error)
- Want to surface important activity on the dashboard

## Prerequisites
- Access to `vault/activity.json`
- Understanding of the activity event schema

## Steps

### Posting an Activity Event (API)

**Using curl**:
```bash
curl -X POST http://localhost:3000/api/activity \
  -H "Content-Type: application/json" \
  -d '{
    "type": "research",
    "title": "Completed OHSU account research",
    "description": "Gathered contact info, budget, and project timeline",
    "timestamp": "2026-02-08T00:00:00.000Z",
    "metadata": {
      "account": "OHSU",
      "agent": "claude-researcher"
    }
  }'
```

**Using JavaScript (Server-Side)**:
```typescript
// In any API route
const response = await fetch('http://localhost:3000/api/activity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'task_complete',
    title: 'Task completed: Send proposal to OHSU',
    description: 'Proposal sent via email to jane.smith@ohsu.edu',
    timestamp: new Date().toISOString(),
    metadata: {
      taskId: 'task-123',
      agent: 'claude-writer',
    }
  })
});
```

### Activity Event Schema

**Required Fields**:
- `type` (string) — Event type (see types below)
- `title` (string) — Short summary (max 100 chars)
- `timestamp` (ISO string) — When it happened

**Optional Fields**:
- `description` (string) — Longer details
- `metadata` (object) — Arbitrary key-value pairs for context

**Event Types** (suggested conventions):
- `research` — Research completed
- `task_complete` — Task finished
- `task_created` — New task added
- `deal_update` — Deal status changed
- `deploy` — Code deployed
- `error` — Error occurred
- `command` — Command executed
- `note` — General note/update
- `agent_spawn` — Agent started
- `agent_complete` — Agent finished

### Viewing the Activity Feed

**Dashboard** (`/`):
- Shows most recent 10 activities
- Auto-refreshes when new events are posted
- Displays timestamp, type, title, description

**Activity Page** (`/activity`):
- Full list of all activities
- Filterable by type
- Sortable by timestamp

### Reading Activity Data (API)

**GET /api/activity** — List all activities
```bash
curl http://localhost:3000/api/activity
```

**Response**:
```json
{
  "activities": [
    {
      "id": "act-abc123",
      "type": "research",
      "title": "Completed OHSU research",
      "description": "...",
      "timestamp": "2026-02-08T00:00:00.000Z",
      "metadata": { "account": "OHSU" }
    }
  ]
}
```

### Activity File Structure

**Location**: `vault/activity.json`

**Format**:
```json
{
  "activities": [
    {
      "id": "act-1707350400000",
      "type": "research",
      "title": "...",
      "description": "...",
      "timestamp": "2026-02-08T00:00:00.000Z",
      "metadata": {}
    }
  ]
}
```

**Auto-generated Fields**:
- `id` — Generated from timestamp + random suffix

### Deleting Old Activities

Activities are stored indefinitely by default. To clean up:

**Manual cleanup**:
```bash
cd vault
# Edit activity.json, remove old entries
nano activity.json
```

**Automated cleanup** (future feature):
```typescript
// Pseudo-code for TTL cleanup
const ONE_MONTH_AGO = Date.now() - 30 * 24 * 60 * 60 * 1000;
activities = activities.filter(a => 
  new Date(a.timestamp).getTime() > ONE_MONTH_AGO
);
```

### Integrating with Agents

**Example: Agent posts activity when spawned**
```typescript
// In agent spawn logic
await fetch('/api/activity', {
  method: 'POST',
  body: JSON.stringify({
    type: 'agent_spawn',
    title: `Agent started: ${agentName}`,
    description: `Spawned to handle: ${taskDescription}`,
    timestamp: new Date().toISOString(),
    metadata: {
      sessionId: session.id,
      agent: agentName,
      model: 'claude-sonnet-4',
    }
  })
});
```

**Example: Agent posts on completion**
```typescript
await fetch('/api/activity', {
  method: 'POST',
  body: JSON.stringify({
    type: 'agent_complete',
    title: `Agent finished: ${agentName}`,
    description: `Result: ${result}`,
    timestamp: new Date().toISOString(),
    metadata: {
      sessionId: session.id,
      duration: session.durationMs,
      tokens: session.totalTokens,
      cost: session.estimatedCost,
    }
  })
});
```

## Expected Output

### Successful POST
```json
{
  "success": true,
  "activity": {
    "id": "act-1707350400123",
    "type": "research",
    "title": "Completed OHSU research",
    "timestamp": "2026-02-08T00:00:00.000Z"
  }
}
```

### Dashboard Display
```
Recent Activity

🔍 Research • 2 minutes ago
   Completed OHSU account research
   Gathered contact info, budget, and project timeline
   
✅ Task Complete • 5 minutes ago
   Task completed: Send proposal
   Proposal sent via email
```

### Activity Page
```
All Activity (50 events)

Filter: [All Types ▼]  Sort: [Newest First ▼]

┌────────────────────────────────────────┐
│ 🔍 Research • Feb 8, 12:00 PM         │
│ Completed OHSU account research        │
│ account: OHSU, agent: claude-researcher│
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ✅ Task Complete • Feb 8, 11:55 AM     │
│ Task completed: Send proposal          │
│ taskId: task-123, agent: claude-writer │
└────────────────────────────────────────┘
```

## Edge Cases

### Invalid Event Type
**Behavior**: Accepts any string, no validation

**Best Practice**: Use consistent types for filtering/grouping

**Recommendation**: Add type validation in future:
```typescript
const VALID_TYPES = ['research', 'task_complete', 'deploy', 'error'];
if (!VALID_TYPES.includes(type)) {
  return { error: 'Invalid event type' };
}
```

### Missing Title
**Behavior**: Current API allows, but UI may break

**Validation** (add to route):
```typescript
if (!title || title.trim() === '') {
  return NextResponse.json(
    { error: 'Title is required' },
    { status: 400 }
  );
}
```

### Duplicate Events
**Problem**: Same event posted multiple times (e.g., retry logic)

**Solution**: Implement deduplication by content hash
```typescript
const hash = crypto
  .createHash('sha256')
  .update(JSON.stringify({ type, title, timestamp }))
  .digest('hex')
  .slice(0, 16);

const id = `act-${hash}`;
// Check if ID exists before adding
```

### Activity File Corruption
**Problem**: Invalid JSON in `vault/activity.json`

**Recovery**:
```bash
cd vault
# Backup corrupted file
cp activity.json activity.json.backup

# Reset to empty state
echo '{"activities":[]}' > activity.json

# Restore from backup manually if needed
```

### Large Activity Log Performance
**Problem**: 1000+ activities slow down dashboard load

**Solution**:
1. Paginate API: `GET /api/activity?limit=50&offset=0`
2. Archive old activities to separate file
3. Implement database instead of JSON file (future)

### Time Zone Issues
**Problem**: Timestamps display in wrong time zone

**Solution**: Always use ISO 8601 UTC timestamps
```typescript
// GOOD
timestamp: new Date().toISOString()  // "2026-02-08T00:00:00.000Z"

// BAD
timestamp: new Date().toString()  // "Fri Feb 08 2026 00:00:00 GMT-0800"
```

UI should convert to local time for display using `date-fns`:
```typescript
import { formatDistanceToNow } from 'date-fns';
formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
// "2 minutes ago"
```

## Cost
- **Time**: <100ms to post an activity
- **Storage**: ~200 bytes per activity
- **File I/O**: Reads entire file + appends + writes back (acceptable for <1000 activities)

**Recommendation**: Migrate to database (SQLite/PostgreSQL) when activity count >1000

---

**Related Directives**:
- `task-management.md` — Post activities when tasks change
- `agent-monitoring.md` — Log agent lifecycle events
- `bigquery-memory.md` — Archive activities to BigQuery for long-term storage
