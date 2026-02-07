---
title: "Outlook Automation System"
date: 2026-02-06
tags: [project, outlook, automation, email]
description: "COM-based Outlook API server on Windows VM for email/calendar automation"
---

# Outlook Automation System

**Status:** Live and operational
**API:** `http://192.168.122.104:8899`
**Version:** v3 (subfolder support + body preview)

## Architecture

- Windows 10 VM (`fortinet-windows`) on KVM
- Python 3.12 + pywin32 (COM automation)
- HTTP server running in interactive session (user: samso)
- Scheduled Task `OutlookAPI` for auto-start

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | Health check |
| GET | `/inbox?count=N` | Latest N inbox emails |
| GET | `/unread?folder=NAME` | Unread emails (optionally by folder) |
| GET | `/folder?name=NAME&count=N&unread=true&body=true` | Read specific folder |
| GET | `/calendar` | Next 48hrs of events |
| GET | `/folders` | List all folders with counts |
| POST | `/draft` | Create draft email (JSON: to, subject, body) |
| POST | `/search` | Search emails (JSON: query, folder) |

## VM Details

- **IP:** 192.168.122.104
- **SSH:** `sshpass -p 'P4ul2026' ssh -tt paul@192.168.122.104`
- **VNC:** port 5900, noVNC at localhost:6080
- **Firewall rule:** Port 8899 inbound allowed

## Key Capabilities

- Read any Outlook folder (including E-Rate subfolder)
- Create HTML draft emails for review
- Search inbox by subject
- Calendar integration (next 48hrs)
- Body preview for email content analysis

## Used For

- E-Rate lead monitoring and outreach drafting
- Morning SLED digest (cron job, 7am MST)
- Email triage and prioritization
