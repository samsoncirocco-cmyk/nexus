#!/usr/bin/env python3
"""
Create OpenClaw Master Google Sheet with 4 tabs and full configuration.
"""
import os
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# Load credentials with proper scopes
creds_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS',
                            '/Users/maryobrien/project/.gcp-service-account.json')
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
]
credentials = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
sheets_service = build('sheets', 'v4', credentials=credentials)

print("🚀 Creating OpenClaw Master Google Sheet...")

# Create the spreadsheet with 4 sheets
spreadsheet = {
    'properties': {'title': 'OpenClaw Master'},
    'sheets': [
        {'properties': {'title': 'agent_log', 'gridProperties': {'rowCount': 1000, 'columnCount': 10}}},
        {'properties': {'title': 'tasks', 'gridProperties': {'rowCount': 1000, 'columnCount': 12}}},
        {'properties': {'title': 'contacts', 'gridProperties': {'rowCount': 500, 'columnCount': 7}}},
        {'properties': {'title': 'config', 'gridProperties': {'rowCount': 200, 'columnCount': 5}}}
    ]
}

result = sheets_service.spreadsheets().create(body=spreadsheet).execute()
spreadsheet_id = result['spreadsheetId']
print(f"✅ Sheet created: {spreadsheet_id}")

# Get sheet IDs
sheets = result['sheets']
sheet_ids = {sheet['properties']['title']: sheet['properties']['sheetId'] for sheet in sheets}

# Define headers
headers = {
    'agent_log': ['timestamp', 'agent_id', 'action_type', 'entity_type', 'entity_id', 'summary', 'input_hash', 'decision_rationale', 'confidence', 'parent_action_id'],
    'tasks': ['task_id', 'created_at', 'created_by', 'title', 'status', 'priority', 'assigned_to', 'source_type', 'source_id', 'due_date', 'context_json', 'last_updated'],
    'contacts': ['email', 'name', 'relationship', 'last_contact', 'interaction_count', 'notes', 'priority_score'],
    'config': ['key', 'value', 'scope', 'updated_at', 'updated_by']
}

# Sample data
sample_data = {
    'agent_log': [['2026-02-07T18:45:32Z', 'triage', 'OBSERVE', 'email', 'msg_xyz', 'Email from alice@company.com', 'h7f3k2j1', 'Contains ASAP', '0.95', '']],
    'tasks': [['task_001', '2026-02-07T18:45:45Z', 'triage', 'Review Q1 budget', 'pending', 'P1', 'research', 'email', 'msg_xyz', '2026-02-10', '{}', '2026-02-07T18:45:45Z']],
    'contacts': [['alice@company.com', 'Alice Chen', 'colleague', '2026-02-07T18:45:32Z', '47', 'CFO', '0.95']],
    'config': [['triage.urgency_keywords', 'ASAP,critical,urgent', 'global', '2026-02-07T18:00:00Z', 'human']]
}

# Build batch update requests
requests = []
for sheet_name, sheet_id in sheet_ids.items():
    # Add headers (bold)
    requests.append({
        'updateCells': {
            'range': {'sheetId': sheet_id, 'startRowIndex': 0, 'endRowIndex': 1},
            'rows': [{'values': [{'userEnteredValue': {'stringValue': h}, 'userEnteredFormat': {'textFormat': {'bold': True}}} for h in headers[sheet_name]]}],
            'fields': 'userEnteredValue,userEnteredFormat'
        }
    })

    # Add sample data
    requests.append({
        'updateCells': {
            'range': {'sheetId': sheet_id, 'startRowIndex': 1},
            'rows': [{'values': [{'userEnteredValue': {'stringValue': str(v)}} for v in row]} for row in sample_data[sheet_name]],
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
sheets_service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body={'requests': requests}).execute()
print("✅ Headers and sample data added")

# Save to .env
env_file = '/Users/maryobrien/project/.env'
with open(env_file, 'a') as f:
    f.write(f'\nGOOGLE_SHEET_ID={spreadsheet_id}\n')

# Print results
sheet_url = f'https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit'
print(f"\n{'='*70}")
print(f"🎉 GOOGLE SHEETS DEPLOYMENT COMPLETE")
print(f"{'='*70}")
print(f"Sheet ID: {spreadsheet_id}")
print(f"URL: {sheet_url}")
print(f"{'='*70}\n")
