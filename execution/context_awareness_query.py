#!/usr/bin/env python3
"""
Context Awareness Query Script
Queries Second Brain data lake for:
- Recent emails (BigQuery)
- Open tasks (Google Sheets)
- Contacts (Google Sheets)
- Recent AI analyses (BigQuery)

Then performs semantic search and lead analysis.
"""

import json
import os
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from collections import defaultdict

from google.auth import default
from google.cloud import bigquery
from googleapiclient.discovery import build

# Configuration
PROJECT_ID = os.getenv('PROJECT_ID', 'killuacode')
SHEET_ID = os.getenv('GOOGLE_SHEET_ID', '15-3fveXfHSKyTXmQ3x344ie4p9rbtTZGaNl-GLQ8Eac')

# Keywords for semantic search
SEARCH_KEYWORDS = [
    'E-Rate', 'Fortinet', 'displacement', 'RFP', 'bid',
    'Elkhorn', 'Burlington Notre Dame'
]

# Lead names to track
LEAD_NAMES = ['Elkhorn', 'Burlington Notre Dame']

# Pipeline value estimates (based on typical E-Rate deal sizes)
PIPELINE_ESTIMATES = {
    'E-Rate': 50000,
    'Fortinet': 75000,
    'displacement': 100000,
    'RFP': 150000,
    'bid': 100000,
    'Elkhorn': 75000,
    'Burlington Notre Dame': 100000
}


def get_clients():
    """Initialize BigQuery and Sheets clients with explicit scopes."""
    SCOPES = [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/bigquery'
    ]
    credentials, project = default(scopes=SCOPES)
    
    # Use the discovered project if PROJECT_ID env var is not set/default
    project_id = PROJECT_ID if PROJECT_ID != 'killuacode' else project
    
    print(f"      ✓ Authenticated with project: {project_id}")
    if hasattr(credentials, 'scopes') and credentials.scopes:
        print(f"      ✓ Scopes: {credentials.scopes}")
    else:
        print(f"      ✓ Scopes: (unable to determine, likely default ADC)")
    
    bq = bigquery.Client(project=project_id, credentials=credentials)
    sheets = build('sheets', 'v4', credentials=credentials)
    
    # Debug BigQuery
    try:
        datasets = list(bq.list_datasets())
        print(f"      ✓ Datasets found: {[d.dataset_id for d in datasets]}")
        
        # Check all tables in openclaw
        dataset_ref = bq.dataset('openclaw')
        tables = list(bq.list_tables(dataset_ref))
        if tables:
            print(f"      ✓ Tables in openclaw:")
            for table in tables:
                t_ref = f"{project_id}.openclaw.{table.table_id}"
                try:
                    t = bq.get_table(t_ref)
                    print(f"        - {table.table_id}: {t.num_rows} rows")
                except:
                    print(f"        - {table.table_id}: (error getting row count)")
        else:
            print(f"      ✓ No tables found in openclaw dataset")

    except Exception as e:
        print(f"      ⚠️ Error listing datasets/tables: {e}")

    return bq, sheets


def fetch_recent_emails(bq: bigquery.Client, days: int = 7) -> List[Dict]:
    """Fetch recent emails from BigQuery."""
    query = f"""
    SELECT
      event_id,
      timestamp,
      JSON_VALUE(payload, '$.message_id') as message_id,
      JSON_VALUE(payload, '$.from') as from_addr,
      JSON_VALUE(payload, '$.subject') as subject,
      JSON_VALUE(payload, '$.snippet') as snippet,
      JSON_VALUE(payload, '$.thread_id') as thread_id,
      source
    FROM `{PROJECT_ID}.openclaw.events`
    WHERE source = 'gmail'
      AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
    ORDER BY timestamp DESC
    LIMIT 100
    """

    rows = list(bq.query(query).result())
    emails = []
    for row in rows:
        emails.append({
            'event_id': row.event_id,
            'timestamp': row.timestamp.isoformat() if row.timestamp else None,
            'message_id': row.message_id,
            'from': row.from_addr,
            'subject': row.subject,
            'snippet': row.snippet,
            'thread_id': row.thread_id,
            'source': row.source
        })
    return emails


def fetch_recent_ai_analysis(bq: bigquery.Client, days: int = 7) -> List[Dict]:
    """Fetch recent AI analyses from BigQuery."""
    query = f"""
    SELECT
      analysis_id,
      timestamp,
      analysis_type,
      input_summary,
      confidence
    FROM `{PROJECT_ID}.openclaw.ai_analysis`
    WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
    ORDER BY timestamp DESC
    LIMIT 50
    """

    rows = list(bq.query(query).result())
    analyses = []
    for row in rows:
        analyses.append({
            'analysis_id': row.analysis_id,
            'timestamp': row.timestamp.isoformat() if row.timestamp else None,
            'analysis_type': row.analysis_type,
            'input_summary': row.input_summary,
            'confidence': row.confidence
        })
    return analyses


def fetch_open_tasks(sheets) -> List[Dict]:
    """Fetch open tasks from Google Sheets."""
    try:
        result = sheets.spreadsheets().values().get(
            spreadsheetId=SHEET_ID,
            range='Tasks!A:L'
        ).execute()

        rows = result.get('values', [])
        if not rows or len(rows) < 2:
            return []

        headers = rows[0]
        tasks = []

        for row in rows[1:]:
            # Pad row to match headers length
            row = row + [''] * (len(headers) - len(row))
            task = dict(zip(headers, row))

            # Filter for open tasks
            status = task.get('status', '').lower()
            if status not in ['done', 'completed', 'closed', 'cancelled', '']:
                tasks.append(task)

        return tasks
    except Exception as e:
        print(f"Error fetching tasks: {e}")
        return []


def fetch_contacts(sheets) -> List[Dict]:
    """Fetch contacts from Google Sheets."""
    try:
        result = sheets.spreadsheets().values().get(
            spreadsheetId=SHEET_ID,
            range='Contacts!A:D'
        ).execute()

        rows = result.get('values', [])
        if not rows or len(rows) < 2:
            return []

        headers = rows[0]
        contacts = []

        for row in rows[1:]:
            row = row + [''] * (len(headers) - len(row))
            contacts.append(dict(zip(headers, row)))

        return contacts
    except Exception as e:
        print(f"Error fetching contacts: {e}")
        return []


def semantic_search(emails: List[Dict], keywords: List[str]) -> Dict[str, List[Dict]]:
    """Perform semantic search across emails for keywords."""
    results = defaultdict(list)

    for email in emails:
        text = f"{email.get('subject', '')} {email.get('snippet', '')} {email.get('from', '')}".lower()

        for keyword in keywords:
            if keyword.lower() in text:
                # Check if we already have this email for another keyword
                already_added = any(
                    email['event_id'] == existing['event_id']
                    for existing in results[keyword]
                )
                if not already_added:
                    results[keyword].append(email)

    return dict(results)


def identify_leads(emails: List[Dict], contacts: List[Dict]) -> List[Dict]:
    """Identify leads from emails and contacts."""
    leads = []
    now = datetime.now()

    # Create contact lookup
    contact_lookup = {}
    for contact in contacts:
        name = contact.get('name', '')
        email_addr = contact.get('email', '')
        if name:
            contact_lookup[name.lower()] = contact
        if email_addr:
            contact_lookup[email_addr.lower()] = contact

    # Group emails by thread/conversation
    threads = defaultdict(list)
    for email in emails:
        thread_id = email.get('thread_id') or email.get('event_id')
        threads[thread_id].append(email)

    # Analyze each thread for leads
    processed_threads = set()
    for email in emails:
        thread_id = email.get('thread_id') or email.get('event_id')
        if thread_id in processed_threads:
            continue
        processed_threads.add(thread_id)

        # Check for lead names in subject/from
        subject = email.get('subject', '')
        from_addr = email.get('from', '')
        text = f"{subject} {from_addr}".lower()

        for lead_name in LEAD_NAMES:
            if lead_name.lower() in text:
                thread_emails = threads[thread_id]
                last_activity = max(
                    datetime.fromisoformat(e['timestamp'].replace('Z', '+00:00'))
                    for e in thread_emails if e.get('timestamp')
                ) if thread_emails else now

                days_since_activity = (now - last_activity).days
                is_stale = days_since_activity >= 3

                # Determine pipeline value
                pipeline_value = PIPELINE_ESTIMATES.get(lead_name, 50000)
                for keyword in SEARCH_KEYWORDS:
                    if keyword.lower() in text or any(
                        keyword.lower() in (e.get('subject', '') + e.get('snippet', '')).lower()
                        for e in thread_emails
                    ):
                        pipeline_value = max(pipeline_value, PIPELINE_ESTIMATES.get(keyword, 0))

                lead_info = {
                    'name': lead_name,
                    'email': from_addr,
                    'subject': subject,
                    'last_activity': last_activity.isoformat(),
                    'days_since_activity': days_since_activity,
                    'is_stale': is_stale,
                    'thread_id': thread_id,
                    'email_count': len(thread_emails),
                    'pipeline_value': pipeline_value,
                    'keywords_found': [
                        k for k in SEARCH_KEYWORDS
                        if k.lower() in text or any(
                            k.lower() in (e.get('subject', '') + e.get('snippet', '')).lower()
                            for e in thread_emails
                        )
                    ]
                }
                leads.append(lead_info)
                break

    return sorted(leads, key=lambda x: (-x['pipeline_value'], x['days_since_activity']))


def generate_follow_up_message(lead: Dict) -> str:
    """Generate a personalized follow-up message."""
    name = lead['name']
    days = lead['days_since_activity']
    keywords = lead.get('keywords_found', [])

    if days > 7:
        opening = f"It's been a while since we last connected about"
    elif days > 3:
        opening = f"I wanted to follow up on our recent conversation about"
    else:
        opening = f"Following up on our recent discussion about"

    if 'E-Rate' in keywords or 'Fortinet' in keywords:
        context = "your network security and E-Rate funding needs"
    elif 'RFP' in keywords or 'bid' in keywords:
        context = "the upcoming RFP and bidding opportunity"
    elif 'displacement' in keywords:
        context = "the network displacement project"
    else:
        context = "your infrastructure needs"

    message = f"{opening} {context}. I know how busy things can get, but I wanted to make sure you have everything you need from us. Is there anything I can help clarify or any questions I can answer?"

    return message


def main():
    """Main execution."""
    print("=" * 80)
    print("CONTEXT AWARENESS - SECOND BRAIN DATA LAKE QUERY")
    print("=" * 80)
    print()

    # Initialize clients
    print("[1/5] Initializing BigQuery and Sheets clients...")
    bq, sheets = get_clients()
    print("      ✓ Clients initialized")
    print()

    # Fetch data
    print("[2/5] Fetching recent emails (last 7 days)...")
    emails = fetch_recent_emails(bq, days=7)
    print(f"      ✓ Found {len(emails)} emails")
    print()

    print("[3/5] Fetching open tasks...")
    tasks = fetch_open_tasks(sheets)
    print(f"      ✓ Found {len(tasks)} open tasks")
    print()

    print("[4/5] Fetching contacts...")
    contacts = fetch_contacts(sheets)
    print(f"      ✓ Found {len(contacts)} contacts")
    print()

    print("[5/5] Fetching recent AI analyses...")
    analyses = fetch_recent_ai_analysis(bq, days=7)
    print(f"      ✓ Found {len(analyses)} analyses")
    print()

    # Semantic search
    print("-" * 80)
    print("SEMANTIC SEARCH RESULTS")
    print("-" * 80)
    print()

    search_results = semantic_search(emails, SEARCH_KEYWORDS)
    for keyword, matched_emails in search_results.items():
        print(f"Keyword: '{keyword}' - {len(matched_emails)} matches")
        for email in matched_emails[:3]:  # Show top 3
            print(f"  - {email.get('from', 'Unknown')}: {email.get('subject', 'No subject')[:60]}")
        if len(matched_emails) > 3:
            print(f"  ... and {len(matched_emails) - 3} more")
        print()

    # Lead identification
    print("-" * 80)
    print("LEAD ANALYSIS & PIPELINE")
    print("-" * 80)
    print()

    leads = identify_leads(emails, contacts)

    if not leads:
        print("No leads identified from recent email activity.")
        print("Consider reviewing contacts manually for active opportunities.")
    else:
        print(f"Identified {len(leads)} active leads:\n")

        stale_leads = []
        active_leads = []

        for lead in leads:
            if lead['is_stale']:
                stale_leads.append(lead)
            else:
                active_leads.append(lead)

        # Active leads
        if active_leads:
            print("🟢 ACTIVE LEADS (Follow up soon):")
            print("-" * 40)
            for i, lead in enumerate(active_leads, 1):
                print(f"{i}. {lead['name']}")
                print(f"   Email: {lead['email']}")
                print(f"   Subject: {lead['subject'][:60]}...")
                print(f"   Last Activity: {lead['days_since_activity']} days ago")
                print(f"   Estimated Value: ${lead['pipeline_value']:,}")
                print(f"   Keywords: {', '.join(lead['keywords_found'])}")
                print(f"   Suggested Message:")
                print(f"   \"{generate_follow_up_message(lead)}\"")
                print()

        # Stale leads
        if stale_leads:
            print()
            print("🔴 STALE LEADS (⚠️ No activity in 3+ days):")
            print("-" * 40)
            for i, lead in enumerate(stale_leads, 1):
                print(f"{i}. {lead['name']} ⚠️")
                print(f"   Email: {lead['email']}")
                print(f"   Subject: {lead['subject'][:60]}...")
                print(f"   Last Activity: {lead['days_since_activity']} days ago (STALE)")
                print(f"   Estimated Value: ${lead['pipeline_value']:,}")
                print(f"   Keywords: {', '.join(lead['keywords_found'])}")
                print(f"   URGENT - Suggested Re-engagement:")
                print(f"   \"{generate_follow_up_message(lead)}\"")
                print()

    # Summary statistics
    print("-" * 80)
    print("SUMMARY STATISTICS")
    print("-" * 80)
    print()

    total_pipeline = sum(lead['pipeline_value'] for lead in leads)
    stale_pipeline = sum(lead['pipeline_value'] for lead in leads if lead['is_stale'])

    print(f"Total Leads Identified: {len(leads)}")
    print(f"Active Leads: {len([l for l in leads if not l['is_stale']])}")
    print(f"Stale Leads: {len([l for l in leads if l['is_stale']])}")
    print(f"Total Pipeline Value: ${total_pipeline:,}")
    print(f"At-Risk Pipeline (Stale): ${stale_pipeline:,}")
    print()

    print("Open Tasks Summary:")
    for task in tasks[:5]:
        title = task.get('title', task.get('Task', 'Untitled'))
        status = task.get('status', 'Unknown')
        assignee = task.get('assignee', task.get('Assignee', 'Unassigned'))
        print(f"  - {title[:50]}... ({status}) - {assignee}")
    if len(tasks) > 5:
        print(f"  ... and {len(tasks) - 5} more tasks")
    print()

    # Return structured data for further processing
    output = {
        'timestamp': datetime.now().isoformat(),
        'summary': {
            'email_count': len(emails),
            'task_count': len(tasks),
            'contact_count': len(contacts),
            'analysis_count': len(analyses),
            'lead_count': len(leads),
            'total_pipeline_value': total_pipeline,
            'stale_pipeline_value': stale_pipeline
        },
        'emails': emails[:10],  # Top 10 for reference
        'tasks': tasks[:10],
        'contacts': contacts[:10],
        'analyses': analyses[:5],
        'search_results': search_results,
        'leads': leads
    }

    # Save to file
    output_path = '/Users/maryobrien/second-brain/context_awareness_report.json'
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2, default=str)

    print(f"Full report saved to: {output_path}")
    print()
    print("=" * 80)

    return output


if __name__ == '__main__':
    result = main()
