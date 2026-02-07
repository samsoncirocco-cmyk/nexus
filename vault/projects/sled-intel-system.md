---
title: "SLED Intelligence System"
date: 2026-02-06
tags: [project, sled, intelligence, automation]
description: "5-command sales intelligence system for Fortinet SLED territory"
---

# SLED Intelligence System

**Location:** `skills/sled-intel/`
**Status:** Phase 1 Complete
**Built:** February 6, 2026

## Commands

| Command | Purpose |
|---------|---------|
| `/sled-buzz [topic]` | SLED cybersecurity news & discussions (Reddit, CISA, GovTech) |
| `/research-account [name]` | Deep-dive on a specific account (news, RFPs, leadership) |
| `/competitor-intel [vendor]` | Track Palo Alto, Cisco, CrowdStrike, etc. |
| `/trigger-scan` | Procurement events, security incidents, budget approvals |
| `/personalize [name] [org]` | Generate personalization hooks for prospects |

## Architecture

- **22 files, ~80KB Python**
- 8 source adapters (Reddit, X, GovTech, procurement portals, news, SAM.gov, CISA, LinkedIn)
- SLED-specific scoring with signal_strength dimension
- Graceful degradation — works with zero API keys
- CISA KEV catalog integration
- All stdlib Python — zero dependencies
- JSON output (`--emit json`) for piping

## Integration

- Configured as periodic heartbeat check (SLED Intel 1-2x daily)
- Morning digest cron job (7am MST weekdays)
- Cross-references against `projects/sled-toolkit/accounts.csv` (832 accounts)
- Default territory: IA, NE, SD

## Data Sources

- ErateProfitWorks.com (via Outlook API at VM:8899)
- CISA Known Exploited Vulnerabilities catalog (RSS)
- GovTech / StateScoop / EdScoop (web scraping)
- State procurement portals (IA/NE/SD)
- Reddit: r/k12sysadmin, r/sysadmin, r/cybersecurity, r/govIT
