-- BigQuery Test Data for OpenClaw Phase 1
-- Insert realistic sample data to test table schemas and query patterns
-- Run in BigQuery console: bq query --use_legacy_sql=false < bigquery_test_data.sql

-- ===========================================================================
-- Test Data: Events Table
-- ===========================================================================

-- Helper: Generate test events
WITH test_timestamps AS (
  SELECT TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL i MINUTE) as ts
  FROM UNNEST(GENERATE_ARRAY(0, 60, 5)) as i
)
INSERT INTO `openclaw.events` (
  event_id, timestamp, agent_id, event_type, source, payload, processed
)
-- Gmail webhook: Q1 Budget email
SELECT
  'gmail-msg_abc123' as event_id,
  TIMESTAMP('2026-02-07T18:45:32Z') as timestamp,
  NULL as agent_id,
  'webhook_received' as event_type,
  'gmail' as source,
  JSON '{"message_id":"msg_abc123","from":"alice@company.com","to":"you@company.com","subject":"Q1 Budget Review - ASAP","snippet":"We need to review the Q1 budget immediately...","thread_id":"thread_xyz789","labels":["INBOX","IMPORTANT"],"timestamp":"2026-02-07T18:45:30Z"}' as payload,
  FALSE as processed

UNION ALL
-- Agent action: Triage decision
SELECT
  'action-abc456' as event_id,
  TIMESTAMP('2026-02-07T18:45:50Z') as timestamp,
  'triage' as agent_id,
  'action_taken' as event_type,
  'agent' as source,
  JSON '{"action_type":"DECIDE","entity_type":"task","entity_id":"task_001","summary":"Create task: Review Q1 budget","rationale":"Email from CFO with urgent language, assigned P0","confidence":0.87,"parent_action_id":"gmail-msg_abc123"}' as payload,
  TRUE as processed

UNION ALL
-- Error event example
SELECT
  'error-xyz789' as event_id,
  TIMESTAMP('2026-02-07T19:00:15Z') as timestamp,
  'research' as agent_id,
  'error' as event_type,
  'agent' as source,
  JSON '{"error_type":"api_timeout","service":"gmail","message":"Gmail API timeout after 30s","retry_count":2}' as payload,
  FALSE as processed

UNION ALL
-- Metric event
SELECT
  'metric-m001' as event_id,
  TIMESTAMP('2026-02-07T19:15:00Z') as timestamp,
  'system' as agent_id,
  'metric' as event_type,
  'system' as source,
  JSON '{"metric_type":"performance","component":"email_processor","value":{"emails_processed":127,"avg_latency_ms":245,"errors":2}}' as payload,
  TRUE as processed;

-- ===========================================================================
-- Test Data: Decisions Table
-- ===========================================================================

INSERT INTO `openclaw.decisions` (
  decision_id, timestamp, agent_id, trigger_event_id, context_snapshot,
  options_considered, chosen_option, outcome, outcome_timestamp, feedback
)
-- Decision 1: P0 task for budget review
SELECT
  'dec_xyz789' as decision_id,
  TIMESTAMP('2026-02-07T18:45:50Z') as timestamp,
  'triage' as agent_id,
  'gmail-msg_abc123' as trigger_event_id,
  JSON '{"from_email":"alice@company.com","from_name":"Alice Chen","from_priority_score":0.95,"subject":"Q1 Budget Review - ASAP","urgency_keywords":["ASAP"],"existing_tasks_count":3,"max_concurrent_tasks":5}' as context_snapshot,
  JSON '[{"option":"create_task_p0","score":0.92,"reason":"From high-priority contact, urgent language, within capacity"},{"option":"create_task_p1","score":0.45,"reason":"Could deprioritize, but contact urgency suggests P0"},{"option":"ignore","score":0.05,"reason":"Contact too important to ignore"}]' as options_considered,
  'create_task_p0' as chosen_option,
  'pending' as outcome,
  NULL as outcome_timestamp,
  NULL as feedback

UNION ALL
-- Decision 2: Meeting scheduling (with outcome)
SELECT
  'dec_abc456' as decision_id,
  TIMESTAMP('2026-02-06T10:30:00Z') as timestamp,
  'scheduling' as agent_id,
  'gmail-msg_cal001' as trigger_event_id,
  JSON '{"meeting_title":"Project Kickoff","attendees":["alice@company.com","bob@example.com","you@company.com"],"duration_minutes":60,"preferred_timezone":"America/New_York"}' as context_snapshot,
  JSON '[{"option":"schedule_next_week","score":0.85,"reason":"Early week availability"},{"option":"schedule_following_week","score":0.60,"reason":"More lead time"},{"option":"decline","score":0.05,"reason":"Time conflict with Q1 review"}]' as options_considered,
  'schedule_next_week' as chosen_option,
  'success' as outcome,
  TIMESTAMP('2026-02-07T16:00:00Z') as outcome_timestamp,
  JSON '{"feedback":"Meeting scheduled successfully. Alice confirmed attendance."}' as feedback

UNION ALL
-- Decision 3: Failed research task (negative example)
SELECT
  'dec_def789' as decision_id,
  TIMESTAMP('2026-02-05T14:20:00Z') as timestamp,
  'research' as agent_id,
  'gmail-msg_res001' as trigger_event_id,
  JSON '{"research_topic":"Market analysis for Q2","deadline":"2026-02-07","urgency":"high"}' as context_snapshot,
  JSON '[{"option":"deep_research","score":0.75,"reason":"Thorough analysis requested"},{"option":"quick_summary","score":0.40,"reason":"Faster but less comprehensive"},{"option":"defer","score":0.20,"reason":"Other tasks have higher priority"}]' as options_considered,
  'deep_research' as chosen_option,
  'failure' as outcome,
  TIMESTAMP('2026-02-07T09:00:00Z') as outcome_timestamp,
  JSON '{"feedback":"Research incomplete due to data source API failure. Recommend alternative sources.","reason":"API timeout when querying market data"}' as feedback;

-- ===========================================================================
-- Test Data: Observations Table
-- ===========================================================================

INSERT INTO `openclaw.observations` (
  observation_id, timestamp, agent_id, entity_type, entity_id, observation_type,
  value, confidence, expires_at
)
-- Observation 1: Alice Chen communication pattern
SELECT
  'obs_alice_freq' as observation_id,
  TIMESTAMP('2026-02-07T19:00:00Z') as timestamp,
  'triage' as agent_id,
  'person' as entity_type,
  'alice@company.com' as entity_id,
  'frequency' as observation_type,
  JSON '{"emails_last_30_days":47,"avg_response_time_hours":2.3,"preferred_time":"morning","busiest_days":["Monday","Tuesday"],"communication_style":"direct"}' as value,
  0.89 as confidence,
  TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 90 DAY) as expires_at

UNION ALL
-- Observation 2: Project status anomaly
SELECT
  'obs_project_anomaly' as observation_id,
  TIMESTAMP('2026-02-07T14:30:00Z') as timestamp,
  'research' as agent_id,
  'anomaly' as entity_type,
  'acme_deal' as entity_id,
  'silence' as observation_type,
  JSON '{"expected_contact_frequency":"daily","days_since_last_contact":4,"severity":"medium","last_update":"2026-02-03T16:00:00Z","stakeholders":["alice@company.com","bob@example.com"]}' as value,
  0.76 as confidence,
  TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 7 DAY) as expires_at

UNION ALL
-- Observation 3: Task relationship pattern
SELECT
  'obs_task_pattern' as observation_id,
  TIMESTAMP('2026-02-06T12:00:00Z') as timestamp,
  'scheduling' as agent_id,
  'pattern' as entity_type,
  'budget_review_tasks' as entity_id,
  'relationship' as observation_type,
  JSON '{"related_tasks":["task_001","task_002","task_003"],"dependency_chain":"budget_review -> presentation -> approval","average_duration_days":5,"success_rate":0.92}' as value,
  0.82 as confidence,
  TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 30 DAY) as expires_at

UNION ALL
-- Observation 4: Expired observation (should be filtered in valid_observations view)
SELECT
  'obs_expired_001' as observation_id,
  TIMESTAMP('2026-01-15T08:00:00Z') as timestamp,
  'triage' as agent_id,
  'topic' as entity_type,
  'q1_planning' as entity_id,
  'sentiment' as observation_type,
  JSON '{"sentiment":"high_priority","mentions":156,"trend":"increasing"}' as value,
  0.85 as confidence,
  TIMESTAMP('2026-02-01T08:00:00Z') as expires_at;

-- ===========================================================================
-- Verification Queries (run these to test the data)
-- ===========================================================================

-- Show all events
SELECT
  'EVENTS' as test,
  event_id,
  source,
  event_type,
  processed,
  TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), timestamp, MINUTE) as age_minutes
FROM `openclaw.events`
ORDER BY timestamp DESC;

-- Show all decisions with outcomes
SELECT
  'DECISIONS' as test,
  decision_id,
  agent_id,
  outcome,
  JSON_VALUE(options_considered[OFFSET(0)], '$.score') as top_confidence,
  CASE WHEN outcome_timestamp IS NOT NULL THEN 'resolved' ELSE 'pending' END as status
FROM `openclaw.decisions`
ORDER BY timestamp DESC;

-- Show current observations
SELECT
  'OBSERVATIONS' as test,
  observation_id,
  entity_type,
  entity_id,
  observation_type,
  confidence,
  CASE WHEN expires_at > CURRENT_TIMESTAMP() THEN 'valid' ELSE 'expired' END as status
FROM `openclaw.observations`
ORDER BY confidence DESC;

-- Test critical_actions view
SELECT 'VIEW: critical_actions' as test, * FROM `openclaw.critical_actions`;

-- Test decision_audit view
SELECT 'VIEW: decision_audit' as test, * FROM `openclaw.decision_audit` LIMIT 5;

-- Test valid_observations view
SELECT 'VIEW: valid_observations' as test, * FROM `openclaw.valid_observations` LIMIT 5;

-- Count test
SELECT
  'TEST SUMMARY' as metric,
  (SELECT COUNT(*) FROM `openclaw.events`) as event_count,
  (SELECT COUNT(*) FROM `openclaw.decisions`) as decision_count,
  (SELECT COUNT(*) FROM `openclaw.observations`) as observation_count;
