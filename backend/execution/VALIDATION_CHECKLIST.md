# BigQuery Implementation Validation Checklist

## Pre-Deployment Verification

Use this checklist to verify all files are in place and ready for deployment.

### Files Present

```bash
cd /Users/maryobrien/project/execution
ls -lh bigquery_*.{sql,py} BIGQUERY_*.md *.md
```

Expected files:

- [ ] `bigquery_setup.sql` (4.0K) - DDL for dataset, tables, views
- [ ] `bigquery_setup.py` (9.6K) - External tables and test data
- [ ] `bigquery_test_data.sql` (9.2K) - Sample data for validation
- [ ] `BIGQUERY_IMPLEMENTATION.md` (11K) - Complete guide
- [ ] `BIGQUERY_QUICK_REFERENCE.md` (5.8K) - Quick lookup
- [ ] `DEPLOY_BIGQUERY.md` (6K+) - Deployment guide
- [ ] `IMPLEMENTATION_SUMMARY.md` (9.8K) - Delivery summary
- [ ] `README.md` (4.0K) - Quick start guide

### SQL Script Validation

Check `bigquery_setup.sql`:

```bash
grep -c "CREATE" bigquery_setup.sql
grep "CREATE TABLE\|CREATE SCHEMA\|CREATE OR REPLACE VIEW" bigquery_setup.sql
```

Expected output:
- [ ] Contains `CREATE SCHEMA` for `openclaw`
- [ ] Contains `CREATE OR REPLACE TABLE` for `events`
- [ ] Contains `CREATE OR REPLACE TABLE` for `decisions`
- [ ] Contains `CREATE OR REPLACE TABLE` for `observations`
- [ ] Contains `CREATE OR REPLACE VIEW` for `critical_actions`
- [ ] Contains `CREATE OR REPLACE VIEW` for `decision_audit`
- [ ] Contains `CREATE OR REPLACE VIEW` for `valid_observations`
- [ ] Contains `CREATE OR REPLACE VIEW` for `recent_events`

### Python Script Validation

Check `bigquery_setup.py`:

```bash
grep -n "external_tables\|insert_rows_json\|client.query" bigquery_setup.py | head -20
```

Expected:
- [ ] Contains external table definitions
- [ ] Contains test data insertion logic
- [ ] Contains verification queries
- [ ] Handles both `GOOGLE_PROJECT_ID` and `PROJECT_ID` env vars
- [ ] Handles both `GOOGLE_SHEET_ID` and `SHEET_ID` env vars

### Test Data Validation

Check `bigquery_test_data.sql`:

```bash
grep -c "INSERT INTO" bigquery_test_data.sql
```

Expected:
- [ ] Contains INSERT for `events` table (4 rows)
- [ ] Contains INSERT for `decisions` table (3 rows)
- [ ] Contains INSERT for `observations` table (4 rows)
- [ ] Contains verification SELECT statements

## Pre-Deployment Setup

### Environment Check

```bash
# Check if gcloud is configured
which gcloud
gcloud config get-value project
gcloud config get-value account

# Check if bq CLI is available
which bq
bq version
```

Expected:
- [ ] `gcloud` command found
- [ ] Project ID returns a valid project
- [ ] `bq` command found
- [ ] bq version >= 2.0

### GCP Permissions

```bash
# Check current identity
gcloud auth list

# Check BigQuery permissions
bq ls
```

Expected:
- [ ] Authenticated to correct GCP account
- [ ] `bq ls` returns list of datasets (may be empty)
- [ ] No "Access Denied" errors

### Environment Variables

```bash
# Check or set environment variables
export GOOGLE_PROJECT_ID=$(gcloud config get-value project)
echo $GOOGLE_PROJECT_ID

# Verify project ID is not empty
if [ -z "$GOOGLE_PROJECT_ID" ]; then echo "ERROR: Project ID not set"; fi
```

Expected:
- [ ] `GOOGLE_PROJECT_ID` is set
- [ ] `GOOGLE_PROJECT_ID` contains valid project ID (not empty, no spaces)

## Deployment Verification

### Step 1: Run SQL Setup

```bash
# Execute the SQL script
bq query --use_legacy_sql=false < /Users/maryobrien/project/execution/bigquery_setup.sql

# Check for errors in output
```

Expected:
- [ ] Command completes without error
- [ ] No "Table already exists" errors (or acceptable)
- [ ] Output shows schema creation messages

### Step 2: Verify Dataset

```bash
# List tables in openclaw dataset
bq ls -t openclaw

# Show detailed table info
bq show openclaw.events
bq show openclaw.decisions
bq show openclaw.observations
```

Expected output for `bq ls -t openclaw`:
```
       tableId       Type    Labels
 ------------------- ------- --------
  critical_actions   VIEW
  decision_audit     VIEW
  decisions          TABLE
  events             TABLE
  observations       TABLE
  recent_events      VIEW
  valid_observations VIEW
```

Expected for `bq show openclaw.events`:
```
Table project_id:openclaw.events

   Field      |  Type   | Mode | Description
 ------------- --------- ------ -------
  event_id    | STRING  | NULL |
  timestamp   | TIMESTAMP| NULL |
  agent_id    | STRING  | NULLABLE |
  event_type  | STRING  | NULLABLE |
  source      | STRING  | NULLABLE |
  payload     | JSON    | NULLABLE |
  processed   | BOOLEAN | NULLABLE |

Time Partitioning:
 Field: timestamp
 Expiration: 7776000000ms (90 days)

Clustering:
 agent_id, event_type
```

Verify for each:
- [ ] `events`: 7 columns, partitioned by timestamp, clustered by agent_id, event_type
- [ ] `decisions`: 10 columns, partitioned by timestamp, clustered by agent_id
- [ ] `observations`: 9 columns, partitioned by timestamp, clustered by entity_type, entity_id

### Step 3: Test Insert

```bash
# Insert test data
bq query --use_legacy_sql=false < /Users/maryobrien/project/execution/bigquery_test_data.sql

# Count rows
bq query "SELECT COUNT(*) as count FROM openclaw.events"
bq query "SELECT COUNT(*) as count FROM openclaw.decisions"
bq query "SELECT COUNT(*) as count FROM openclaw.observations"
```

Expected:
- [ ] Insert completes without error
- [ ] events table contains 4+ rows
- [ ] decisions table contains 3+ rows
- [ ] observations table contains 4+ rows

### Step 4: Test Sample Queries

```bash
# Test critical_actions view
bq query "SELECT * FROM openclaw.critical_actions LIMIT 1"

# Test decision_audit view
bq query "SELECT * FROM openclaw.decision_audit LIMIT 1"

# Test partitioned query (uses partition filter)
bq query "
SELECT event_id, source
FROM openclaw.events
WHERE DATE(timestamp) = CURRENT_DATE()
LIMIT 1
"

# Test clustered query
bq query "
SELECT decision_id, outcome
FROM openclaw.decisions
WHERE agent_id = 'triage'
LIMIT 1
"
```

Expected:
- [ ] `critical_actions` query returns 0+ rows (may be empty if no high-confidence actions)
- [ ] `decision_audit` query returns results with decision context
- [ ] Partitioned query executes quickly
- [ ] Clustered query returns results (or empty if no matching rows)

### Step 5: Test External Tables (After Sheets Ready)

Once sheets-builder provides Sheet ID:

```bash
# Set Sheet ID
export GOOGLE_SHEET_ID="YOUR_SHEET_ID"

# Run Python setup
cd /Users/maryobrien/project/execution
python3 bigquery_setup.py

# Verify external tables created
bq ls -t openclaw | grep sheets

# Test external table query
bq query "SELECT COUNT(*) FROM openclaw.sheets_agent_log LIMIT 1"
```

Expected:
- [ ] External tables created (sheets_agent_log, sheets_tasks, sheets_contacts, sheets_config)
- [ ] External table queries return data from Sheet
- [ ] No "table not found" errors

## Performance Verification

### Partitioning Test

```bash
# Query with partition filter (fast - scans only today's data)
bq query --dry_run "
SELECT COUNT(*) FROM openclaw.events
WHERE DATE(timestamp) = CURRENT_DATE()
"
```

Expected in output:
- [ ] "Bytes processed" is much smaller than full table size
- [ ] Query plan shows partition pruning

### Clustering Test

```bash
# Query with cluster filter (fast - uses index)
bq query --dry_run "
SELECT * FROM openclaw.events
WHERE agent_id = 'triage'
  AND DATE(timestamp) = CURRENT_DATE()
LIMIT 10
"
```

Expected:
- [ ] Query completes sub-second
- [ ] Bytes processed are minimal

## Final Checklist

### File Integrity
- [ ] All 8 files present in `/Users/maryobrien/project/execution/`
- [ ] SQL scripts are readable and properly formatted
- [ ] Python scripts are syntactically valid (can import)
- [ ] Documentation files are complete

### Database State
- [ ] Dataset `openclaw` exists in US region
- [ ] 3 tables created: events, decisions, observations
- [ ] 4 views created: critical_actions, decision_audit, valid_observations, recent_events
- [ ] Partitioning configured correctly on all tables
- [ ] Clustering configured correctly on all tables
- [ ] 90-day retention set on events table

### Functionality
- [ ] Test data inserted successfully
- [ ] Sample queries return results
- [ ] Views are queryable
- [ ] Partitioning reduces query scope
- [ ] Clustering indexes common filters

### Documentation
- [ ] BIGQUERY_IMPLEMENTATION.md complete (400+ lines)
- [ ] BIGQUERY_QUICK_REFERENCE.md complete (200+ lines)
- [ ] DEPLOY_BIGQUERY.md has step-by-step instructions
- [ ] README.md provides quick start
- [ ] IMPLEMENTATION_SUMMARY.md summarizes delivery

### Team Coordination
- [ ] Message sent to team-lead with deployment status
- [ ] sheets-builder coordination noted (waiting for Sheet ID)
- [ ] cloud-integrator coordination noted (ready for writes)

## Troubleshooting Commands

If any check fails, use these commands to diagnose:

```bash
# Check BigQuery access
bq ls

# Check project ID
gcloud config get-value project

# Check authentication
gcloud auth list

# Test BigQuery query
bq query "SELECT CURRENT_TIMESTAMP() as now"

# Check table schema
bq show -j openclaw.events

# Check if table has data
bq query "SELECT COUNT(*) as row_count FROM openclaw.events"

# Check view definition
bq show openclaw.critical_actions

# Test external table
bq query "SELECT COUNT(*) FROM openclaw.sheets_agent_log" 2>&1
```

## Sign-Off

Once all checks pass:

- [ ] All files verified present and correct
- [ ] SQL deployment successful
- [ ] Tables created with proper schema
- [ ] Test data inserted
- [ ] Sample queries pass
- [ ] Views are functional
- [ ] Performance optimization verified
- [ ] Documentation complete
- [ ] Team coordination established

**Status**: Ready for Phase 1 continuation (Cloud Functions & Pub/Sub)

**Date**: 2026-02-07
**Architect**: BigQuery Implementation Team
