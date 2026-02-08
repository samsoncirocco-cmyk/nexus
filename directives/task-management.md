# Directive: Task Management

## Goal
Create, update, and manage tasks via the `/api/tasks` endpoint and task board UI

## When to Use
- Creating new tasks from the dashboard or command bar
- Updating task status (todo → in-progress → done)
- Assigning tasks to agents
- Tracking task progress and completion

## Prerequisites
- Access to `vault/tasks.json`
- Understanding of task schema and lifecycle

## Steps

### Creating a Task (API)

**Using curl**:
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Research OHSU network requirements",
    "description": "Gather technical requirements for the Q3 network upgrade project",
    "status": "todo",
    "priority": "high",
    "assignedTo": "claude-researcher",
    "dueDate": "2026-02-15",
    "tags": ["research", "accounts", "ohsu"]
  }'
```

**Using the UI**:
1. Navigate to `/tasks`
2. Click "New Task" button
3. Fill in form:
   - Title (required)
   - Description
   - Status (todo, in-progress, done)
   - Priority (low, medium, high, urgent)
   - Assigned to (agent name or person)
   - Due date
   - Tags
4. Click "Create Task"

### Task Schema

**Required Fields**:
- `title` (string) — Task name

**Optional Fields**:
- `description` (string) — Details
- `status` (string) — `todo`, `in-progress`, `done`, `blocked`
- `priority` (string) — `low`, `medium`, `high`, `urgent`
- `assignedTo` (string) — Agent or person name
- `dueDate` (ISO string) — Deadline
- `tags` (array) — Categories/labels
- `createdAt` (ISO string) — Auto-generated if not provided
- `updatedAt` (ISO string) — Auto-updated on changes

**Auto-generated Fields**:
- `id` (string) — `task-{timestamp}-{random}`

### Updating a Task

**PATCH /api/tasks**:
```bash
curl -X PATCH http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task-1707350400-abc123",
    "status": "in-progress"
  }'
```

**Using the UI**:
1. Go to `/tasks`
2. Click on a task card
3. Edit fields in the task detail view
4. Changes save automatically (or click Save button)

**Status Transitions**:
```
todo → in-progress → done
       ↓
     blocked (can transition back to todo)
```

### Listing Tasks

**GET /api/tasks** — All tasks
```bash
curl http://localhost:3000/api/tasks
```

**GET /api/tasks?status=todo** — Filter by status
```bash
curl http://localhost:3000/api/tasks?status=todo
```

**GET /api/tasks?assignedTo=claude-researcher** — Filter by assignee
```bash
curl http://localhost:3000/api/tasks?assignedTo=claude-researcher
```

**Response**:
```json
{
  "tasks": [
    {
      "id": "task-1707350400-abc123",
      "title": "Research OHSU network requirements",
      "description": "...",
      "status": "todo",
      "priority": "high",
      "assignedTo": "claude-researcher",
      "dueDate": "2026-02-15T00:00:00.000Z",
      "tags": ["research", "accounts", "ohsu"],
      "createdAt": "2026-02-08T00:00:00.000Z",
      "updatedAt": "2026-02-08T00:00:00.000Z"
    }
  ]
}
```

### Deleting a Task

**DELETE /api/tasks**:
```bash
curl -X DELETE http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"id": "task-1707350400-abc123"}'
```

### Kanban Board View

**URL**: `/tasks`

**Columns**:
- **To Do** — status: `todo`
- **In Progress** — status: `in-progress`
- **Done** — status: `done`
- **Blocked** — status: `blocked`

**Drag & Drop** (future feature):
- Drag task cards between columns
- Updates `status` field automatically

### Command Bar Integration

**Press `⌘K` → Type "new task"**:
1. Opens task creation modal
2. Fill in title
3. Optionally set status/priority
4. Delegates to agent if assigned

### Integrating with Agents

**Agent creates task for itself**:
```typescript
await fetch('/api/tasks', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Draft proposal for OHSU',
    assignedTo: 'claude-writer',
    status: 'in-progress',
    tags: ['writing', 'proposals']
  })
});
```

**Agent marks task complete**:
```typescript
await fetch('/api/tasks', {
  method: 'PATCH',
  body: JSON.stringify({
    id: taskId,
    status: 'done'
  })
});

// Also post to activity feed
await fetch('/api/activity', {
  method: 'POST',
  body: JSON.stringify({
    type: 'task_complete',
    title: `Task completed: ${task.title}`,
    timestamp: new Date().toISOString()
  })
});
```

### Task File Structure

**Location**: `vault/tasks.json`

**Format**:
```json
{
  "tasks": [
    {
      "id": "task-1707350400-abc123",
      "title": "Research OHSU network requirements",
      "description": "Gather technical requirements...",
      "status": "todo",
      "priority": "high",
      "assignedTo": "claude-researcher",
      "dueDate": "2026-02-15T00:00:00.000Z",
      "tags": ["research", "accounts", "ohsu"],
      "createdAt": "2026-02-08T00:00:00.000Z",
      "updatedAt": "2026-02-08T00:00:00.000Z"
    }
  ]
}
```

## Expected Output

### Successful Task Creation
```json
{
  "success": true,
  "task": {
    "id": "task-1707350400-abc123",
    "title": "Research OHSU network requirements",
    "status": "todo",
    "createdAt": "2026-02-08T00:00:00.000Z"
  }
}
```

### Task Board UI
```
Tasks (12 total)

┌─────────────┬─────────────┬─────────────┬─────────────┐
│   To Do     │ In Progress │    Done     │   Blocked   │
│     (5)     │     (3)     │     (3)     │     (1)     │
├─────────────┼─────────────┼─────────────┼─────────────┤
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │
│ │ Research│ │ │ Draft   │ │ │ Deploy  │ │ │ Legal   │ │
│ │ OHSU    │ │ │ proposal│ │ │ update  │ │ │ review  │ │
│ │         │ │ │         │ │ │         │ │ │         │ │
│ │ HIGH    │ │ │ MEDIUM  │ │ │ LOW     │ │ │ URGENT  │ │
│ │ Due: 2/15│ │ │ Due: 2/10│ │ │ Done: 2/7│ │ │ Waiting │ │
│ └─────────┘ │ └─────────┘ │ └─────────┘ │ └─────────┘ │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### Dashboard Task Widget
```
Your Tasks (3 active)

┌────────────────────────────────────────┐
│ 🔥 Research OHSU network requirements  │
│    High priority • Due Feb 15          │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 📝 Draft proposal                      │
│    In progress • Due Feb 10            │
└────────────────────────────────────────┘
```

## Edge Cases

### Duplicate Task Titles
**Behavior**: Allowed (tasks differentiated by ID)

**Best Practice**: Use descriptive unique titles

**Search**: Tasks are searchable by title/description

### Missing Required Fields
**Current**: Only `title` is required

**Validation** (add to API route):
```typescript
if (!title || title.trim() === '') {
  return NextResponse.json(
    { error: 'Title is required' },
    { status: 400 }
  );
}
```

### Invalid Status Value
**Problem**: API accepts any string for `status`

**Solution**: Add validation
```typescript
const VALID_STATUSES = ['todo', 'in-progress', 'done', 'blocked'];
if (status && !VALID_STATUSES.includes(status)) {
  return NextResponse.json(
    { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
    { status: 400 }
  );
}
```

### Task Not Found (Update/Delete)
**Response**:
```json
{
  "error": "Task not found",
  "id": "task-nonexistent"
}
```

**HTTP Status**: 404

### Overdue Tasks
**Detection** (on GET):
```typescript
tasks.forEach(task => {
  if (task.dueDate && new Date(task.dueDate) < new Date()) {
    task.overdue = true;
  }
});
```

**UI Indicator**: Red border or "OVERDUE" badge

### Concurrent Updates (Race Condition)
**Problem**: Two agents update the same task simultaneously

**Current Behavior**: Last write wins (file is read-modify-write)

**Solution** (future):
- Add `version` field for optimistic locking
- Use database with transaction support
- Implement event sourcing (append-only log)

### Large Task Count Performance
**Problem**: 1000+ tasks slow down UI

**Solution**:
- Implement pagination: `GET /api/tasks?limit=50&page=1`
- Archive completed tasks after 30 days
- Use virtualized list for UI rendering

### Task Dependencies
**Future Feature**: Task A blocks Task B

**Schema Addition**:
```typescript
{
  "id": "task-123",
  "title": "...",
  "blockedBy": ["task-456", "task-789"]  // Can't start until these are done
}
```

## Cost
- **Time**: <100ms to create/update a task
- **Storage**: ~500 bytes per task
- **File I/O**: Full read/write on each operation (acceptable for <500 tasks)

**Recommendation**: Migrate to database when task count >500

---

**Related Directives**:
- `activity-feed.md` — Post activities when tasks change
- `agent-monitoring.md` — Assign tasks to agents
- `gateway-bridge.md` — Delegate tasks via command bar
