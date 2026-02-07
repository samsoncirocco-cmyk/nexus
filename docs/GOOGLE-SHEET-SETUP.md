# 02-GOOGLE-SHEET-SETUP.md: Master Google Sheet Configuration

## Overview

Create one master Google Sheet called `OpenClaw Master` with 4 tabs. This is your operational control center.

**Share with**: yourself (owner), any teammates who need visibility

## Tab 1: `agent_log`

**Purpose**: Human-readable audit trail of every agent action

**Columns** (A through J):
1. `timestamp` (DATETIME) - When the action occurred (ISO 8601, UTC)
2. `agent_id` (STRING) - Which agent (triage, research, scheduling, etc.)
3. `action_type` (STRING) - OBSERVE, DECIDE, ACT, LOG
4. `entity_type` (STRING) - email, task, calendar_event, contact, document
5. `entity_id` (STRING) - Gmail message ID, task ID, etc.
6. `summary` (STRING) - Human-readable description (1-2 sentences)
7. `input_hash` (STRING) - SHA256 hash of input for deduplication
8. `decision_rationale` (STRING) - Why agent chose this action
9. `confidence` (FLOAT) - 0.0-1.0 confidence score
10. `parent_action_id` (STRING) - Links to triggering action (trace chains)

**Example data**:
```
2026-02-07T18:45:32Z | triage | OBSERVE | email | gmail-msg_xyz789 | Email from alice@company.com about Q1 budget | h7f3k2j1 | Contains "ASAP" and "budget", from CFO | 0.95 |
2026-02-07T18:45:45Z | triage | DECIDE | task | task_001 | Create task: Review Q1 budget | g9k2m3l4 | Assigned to research, deadline inferred as 3 days | 0.87 | gmail-msg_xyz789
2026-02-07T19:00:12Z | triage | ACT | task | task_001 | Task created in database | a1b2c3d4 | Auto-assigned P1 priority | 0.92 | g9k2m3l4
```

**Formatting**:
- Sort by timestamp DESC (newest first)
- Freeze header row
- Conditional formatting: confidence > 0.9 = green, < 0.7 = red
- Create pivot table to analyze action_type frequency by agent_id

**Access**: Read/write by agents, read-only by humans (unless fixing data)

---

## Tab 2: `tasks`

**Purpose**: Task board (to-do list, project tracker)

**Columns** (A through L):
1. `task_id` (STRING) - UUID or short ID (primary key)
2. `created_at` (DATETIME) - When created (ISO 8601)
3. `created_by` (STRING) - Agent ID or "human"
4. `title` (STRING) - Task summary (< 100 chars)
5. `status` (STRING) - pending, in_progress, blocked, done, cancelled
6. `priority` (STRING) - P0 (urgent), P1 (high), P2 (normal), P3 (low), P4 (backlog)
7. `assigned_to` (STRING) - Agent ID or person name or "unassigned"
8. `source_type` (STRING) - email, calendar, manual, agent, form
9. `source_id` (STRING) - Reference to originating entity (email ID, calendar event ID, etc.)
10. `due_date` (DATE) - Deadline (YYYY-MM-DD)
11. `context_json` (STRING) - Serialized JSON blob (thread_id, depends_on, etc.)
12. `last_updated` (DATETIME) - Last modification (ISO 8601)

**Example data**:
```
task_001 | 2026-02-07T18:45:45Z | triage | Review Q1 budget | pending | P1 | research | email | gmail-msg_xyz789 | 2026-02-10 | {"thread_id":"thread_abc","depends_on":[],"estimated_hours":2} | 2026-02-07T18:45:45Z
task_002 | 2026-02-07T15:30:00Z | human | Prepare presentation | in_progress | P1 | user | manual | | 2026-02-09 | {"project":"acme","milestone":"kickoff"} | 2026-02-07T19:00:00Z
task_003 | 2026-02-06T10:00:00Z | agent | Send follow-up | blocked | P2 | unassigned | email | gmail-msg_abc123 | 2026-02-08 | {"depends_on":["task_002"],"reason":"waiting for presentation"} | 2026-02-07T16:30:00Z
```

**Formatting**:
- Sort by priority (P0→P4), then due_date (soonest first)
- Freeze header row
- Color code by status: pending=gray, in_progress=blue, blocked=yellow, done=green, cancelled=light gray
- Create kanban view (via Data → Pivot table or use Google Sheets add-on)
- Data validation: status and priority fields should be dropdowns

**Access**: Read/write by all (humans update status, agents claim work)

**Task Lifecycle**:
1. Agent detects opportunity → creates task (status: pending, assigned_to: unassigned)
2. Agent claims work → updates (status: in_progress, assigned_to: agent_id)
3. Agent completes → updates (status: done, last_updated: now)
4. If blocked → status: blocked, add reason to context_json["blocking_reason"]

---

## Tab 3: `contacts`

**Purpose**: People directory with interaction tracking

**Columns** (A through G):
1. `email` (STRING) - Primary key, email address
2. `name` (STRING) - Display name
3. `relationship` (STRING) - colleague, client, vendor, personal, family
4. `last_contact` (DATETIME) - Last interaction timestamp
5. `interaction_count` (INT) - Total number of touchpoints
6. `notes` (STRING) - Agent + human notes (role, context, preferences)
7. `priority_score` (FLOAT) - 0.0-1.0 computed importance

**Example data**:
```
alice@company.com | Alice Chen | colleague | 2026-02-07T18:45:32Z | 47 | CFO, reports directly to CEO, prefers email over Slack | 0.95
bob@example.com | Bob Smith | client | 2026-01-15T09:30:00Z | 12 | Project lead on Acme Corp deal, timezone: PST | 0.78
carol@family.com | Carol | personal | 2026-02-01T20:15:00Z | 156 | Sister, birthday March 15 | 0.45
```

**Formatting**:
- Sort by priority_score DESC (most important first)
- Freeze header row
- Conditional formatting: priority_score gradient (red=low, yellow=medium, green=high)
- Note: `last_contact` and `interaction_count` auto-updated by agents
- Data validation: relationship field dropdown

**Access**: Read/write by agents (auto-updates), readable by humans

**Agent Updates**: When agent sends email/message to someone:
1. If email not in contacts → agent creates new row
2. Update `last_contact` to now
3. Increment `interaction_count`
4. Update `priority_score` based on frequency/importance

---

## Tab 4: `config`

**Purpose**: Central configuration for agents and system

**Columns** (A through E):
1. `key` (STRING) - Config key (primary key with scope as compound)
2. `value` (STRING) - Config value (JSON for complex objects)
3. `scope` (STRING) - global, agent:{id}, skill:{name}
4. `updated_at` (DATETIME) - Last change
5. `updated_by` (STRING) - Who changed it (agent ID or "human")

**Example data**:
```
triage.urgency_keywords | ASAP,critical,urgent,blocking,important | global | 2026-02-07T18:00:00Z | human
triage.max_concurrent_tasks | 5 | agent:triage | 2026-02-07T18:00:00Z | human
research.default_deadline_days | 3 | agent:research | 2026-02-07T18:00:00Z | human
task.default_priority | P2 | global | 2026-02-07T18:00:00Z | human
contact.interaction_weight | {"email":1,"message":1,"call":3,"meeting":5} | global | 2026-02-07T18:00:00Z | human
agent.triage.timezone | America/New_York | agent:triage | 2026-02-07T18:00:00Z | human
skill.google-sheets.enabled | true | skill:google-sheets | 2026-02-07T18:00:00Z | human
```

**Formatting**:
- Sort by scope, then key (for readability)
- Freeze header row
- Data validation: scope field dropdown
- Add comments explaining each config key

**Access**: Read by all agents, write by humans (or special admin agents)

**How Agents Use It**:
```python
# Pseudo-code in agent
urgency_keywords = get_config("triage.urgency_keywords").split(",")
max_tasks = int(get_config("triage.max_concurrent_tasks"))
timezone = get_config(f"agent.{agent_id}.timezone")
```

---

## Setup Checklist

- [ ] Create new Google Sheet named "OpenClaw Master"
- [ ] Share with team (view or edit access)
- [ ] Create 4 tabs with headers (copy-paste headers from above)
- [ ] Set up data validation (status, priority, relationship, scope dropdowns)
- [ ] Freeze header rows
- [ ] Apply conditional formatting for visual clarity
- [ ] Create Google Sheets add-on "Kanban for Google Sheets" for `tasks` view (optional)
- [ ] Get Sheet ID from URL (everything after `/d/` and before `/edit`)
- [ ] Save Sheet ID to `.env` as `GOOGLE_SHEET_ID=...`

---

## Automated Maintenance

**Daily** (via agent or scheduled job):
- Remove cancelled tasks older than 30 days
- Archive completed tasks older than 90 days
- Update `last_contact` and `interaction_count` from BigQuery events
- Recalculate `priority_score` for all contacts

**Weekly** (manual or agent):
- Review blocked tasks and unblock if possible
- Archive old agent_log entries to Drive (keep recent 1000)
- Check for config changes that might affect agents

---

## Integration Points

**From agents**:
- Append rows to `agent_log` (every action logged)
- Create/update rows in `tasks` (work coordination)
- Update rows in `contacts` (interaction tracking)
- Read config from `config` (behavior customization)

**From BigQuery**:
- External tables over Sheets (query Sheets with SQL)
- Trigger recalculations (e.g., priority_score, interaction_count)

**From humans**:
- Manual task creation/updates
- Config changes
- Notes on contacts
- Review agent decisions in agent_log
