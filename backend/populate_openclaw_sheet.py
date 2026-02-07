#!/usr/bin/env python3
"""
Populate existing OpenClaw Master sheet with headers and sample data.
"""
import os
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# Sheet ID from user
SHEET_ID = '15-3fveXfHSKyTXmQ3x344ie4p9rbtTZGaNl-GLQ8Eac'

# Load credentials
creds_path = '/Users/maryobrien/project/.gcp-service-account.json'
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
credentials = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
sheets_service = build('sheets', 'v4', credentials=credentials)

print("🚀 Populating OpenClaw Master Google Sheet...")

# Get current sheet structure
sheet_metadata = sheets_service.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
sheets = sheet_metadata.get('sheets', [])

# Map sheet names to IDs
sheet_map = {}
for sheet in sheets:
    title = sheet['properties']['title']
    sheet_id = sheet['properties']['sheetId']
    sheet_map[title] = sheet_id
    print(f"  Found tab: {title} (ID: {sheet_id})")

# Define headers for each tab
headers = {
    'agent_log': ['timestamp', 'agent_id', 'action_type', 'entity_type', 'entity_id', 'summary', 'input_hash', 'decision_rationale', 'confidence', 'parent_action_id'],
    'tasks': ['task_id', 'created_at', 'created_by', 'title', 'status', 'priority', 'assigned_to', 'source_type', 'source_id', 'due_date', 'context_json', 'last_updated'],
    'contacts': ['email', 'name', 'relationship', 'last_contact', 'interaction_count', 'notes', 'priority_score'],
    'config': ['key', 'value', 'scope', 'updated_at', 'updated_by']
}

# Sample data
sample_data = {
    'agent_log': [['2026-02-07T19:30:00Z', 'triage', 'OBSERVE', 'email', 'msg_xyz', 'Email from alice@company.com', 'h7f3k2j1', 'Contains ASAP keyword', '0.95', '']],
    'tasks': [['task_001', '2026-02-07T19:30:00Z', 'triage', 'Review Q1 budget', 'pending', 'P1', 'research', 'email', 'msg_xyz', '2026-02-10', '{"thread_id":"thread_abc"}', '2026-02-07T19:30:00Z']],
    'contacts': [['alice@company.com', 'Alice Chen', 'colleague', '2026-02-07T19:30:00Z', '47', 'CFO, budget decisions', '0.95']],
    'config': [['triage.urgency_keywords', 'ASAP,critical,urgent,blocking', 'global', '2026-02-07T19:00:00Z', 'human']]
}

# Build batch update requests
requests = []

for sheet_name in ['agent_log', 'tasks', 'contacts', 'config']:
    if sheet_name not in sheet_map:
        print(f"  ⚠️  Tab '{sheet_name}' not found - skipping")
        continue

    sheet_id = sheet_map[sheet_name]

    # Add headers (bold, frozen row)
    requests.append({
        'updateCells': {
            'range': {'sheetId': sheet_id, 'startRowIndex': 0, 'endRowIndex': 1},
            'rows': [{
                'values': [
                    {
                        'userEnteredValue': {'stringValue': h},
                        'userEnteredFormat': {
                            'textFormat': {'bold': True},
                            'backgroundColor': {'red': 0.9, 'green': 0.9, 'blue': 0.9}
                        }
                    } for h in headers[sheet_name]
                ]
            }],
            'fields': 'userEnteredValue,userEnteredFormat'
        }
    })

    # Add sample data
    requests.append({
        'updateCells': {
            'range': {'sheetId': sheet_id, 'startRowIndex': 1},
            'rows': [{
                'values': [{'userEnteredValue': {'stringValue': str(v)}} for v in row]
            } for row in sample_data[sheet_name]],
            'fields': 'userEnteredValue'
        }
    })

    # Freeze header row
    requests.append({
        'updateSheetProperties': {
            'properties': {'sheetId': sheet_id, 'gridProperties': {'frozenRowCount': 1}},
            'fields': 'gridProperties.frozenRowCount'
        }
    })

# Execute batch update
if requests:
    sheets_service.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={'requests': requests}).execute()
    print("✅ Headers and sample data added to all tabs")

# Save Sheet ID to .env
env_file = '/Users/maryobrien/project/.env'
with open(env_file, 'a') as f:
    f.write(f'\nGOOGLE_SHEET_ID={SHEET_ID}\n')
print(f"✅ Sheet ID saved to .env")

# Print results
sheet_url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit'
print(f"\n{'='*70}")
print(f"🎉 GOOGLE SHEETS POPULATED SUCCESSFULLY")
print(f"{'='*70}")
print(f"Sheet ID: {SHEET_ID}")
print(f"URL: {sheet_url}")
print(f"Tabs configured: agent_log, tasks, contacts, config")
print(f"{'='*70}\n")
