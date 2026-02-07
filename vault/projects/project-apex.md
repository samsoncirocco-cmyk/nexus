---
title: "Project Apex — AI Orchestration System"
date: 2026-02-07
tags: [ai, automation, infrastructure, project-apex]
description: "Samson's original multi-bot AI system predating Paul/OpenClaw. The foundation everything else is built on."
---

# Project Apex

## What It Is
Samson's original AI orchestration system — a multi-bot architecture with specialized agents, model routing, Notion as external memory, Docker containers, and Telegram channels per bot. **This predates Paul/OpenClaw** and represents months of thinking about how AI agents should work together.

## Architecture

### Bot System
- **SLED Commander** — Primary coordinator. Manages Salesforce deals, E-Rate research, customer outreach. Direct, action-oriented communication style.
- **TatT Architect** — Creative/technical specialist. Handles TatT startup development, deployment monitoring, code architecture, AR placement math. Technical but accessible.
- **Security Warden** — Background monitor. Runs autonomously checking health, cost, and security. Alert-focused, protective.

### Model Hierarchy (LiteLLM)
```
Ollama (free, local) → Gemini (cost-effective) → Claude (nuanced/ethical) → OpenAI (specialized)
```
Each model has a purpose. Cheap models for simple tasks, expensive ones for nuance.

### Infrastructure
- Docker containers per bot
- Notion databases: Deals, Designs, Incidents, Cost Logs, Pending Approvals
- Telegram channels per bot (#sled-commander, #tatt-architect, #security-warden)
- Execution scripts (deterministic) over direct API calls (probabilistic)
- Self-annealing: bots improve their own directives based on patterns

### Key Databases (Notion)
- **Deals** — Salesforce pipeline tracking
- **Designs** — TatT customer designs (AR tattoo try-on)
- **Incidents** — Error tracking and pattern detection
- **Cost Logs** — Per-model, per-task cost tracking
- **Pending Approvals** — Human-in-the-loop queue

## Communication Principles (from Apex)
1. **Talk Simple** — Plain language, not corporate
2. **Edit messages, don't spam** — Use edit_message for status updates
3. **Emoji for visual clarity** — ✅ success, ⚠️ warning, ❌ error, 🔄 in progress, 🔴 critical
4. **Bot personality** — Each bot has a distinct voice and communication style
5. **Request approval for >$100K decisions** — With inline buttons, timeout escalation, auto-cancel at 24hrs

## Self-Improvement Loop
1. Notice a pattern
2. Verify with logs
3. Update directive
4. Test improvement
5. Announce update
6. Log improvement

## What Carries Forward to OpenClaw/Paul
- The communication style guidelines are gold — adopt them
- Cost optimization thinking (use cheap models for simple tasks)
- Human-in-the-loop approval patterns
- Execution scripts > direct API calls philosophy
- Self-annealing / self-improvement discipline
- Notion database structure (adapt to Second Brain)
- The whole "Talk Simple" rule

## Source
Full Claude-specific instructions: `vault/projects/project-apex-claude-instructions.md`
