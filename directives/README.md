# DOE Framework - Project Integration

This project uses the **DOE (Directives-Orchestration-Execution) Framework** for AI-assisted development.

## Overview

The DOE Framework separates concerns into 3 layers:

1. **Directives** (`directives/`) - SOPs written in Markdown
2. **Orchestration** - AI decision-making and routing
3. **Execution** (`execution/`) - Deterministic Python/TypeScript scripts

## Directory Structure

```
nexus/
├── directives/          # Standard Operating Procedures
│   ├── oauth_linkedin.md
│   ├── oauth_twitter.md
│   ├── oauth_substack.md
│   └── ...
├── execution/           # Deterministic scripts
│   ├── oauth/
│   │   ├── linkedin_flow.py
│   │   ├── twitter_flow.py
│   │   └── token_refresh.py
│   ├── content/
│   │   ├── adapt_for_platform.py
│   │   └── voice_training.py
│   └── utils/
│       ├── supabase_client.py
│       └── platform_apis.py
└── .tmp/               # Temporary/intermediate files (gitignored)
```

## Why DOE for Nexus?

Platform OAuth integrations are deterministic business logic:
- Token exchanges follow strict RFC specs
- API calls have predictable formats
- Error handling follows known patterns

By pushing this to execution scripts:
- I handle the orchestration (decisions, routing)
- Scripts handle the execution (reliable, testable)
- Errors self-anneal back into directives

## Getting Started

1. Read the directive for the task at hand
2. Check if an execution script exists
3. If not, create one following the directive pattern
4. Execute and iterate

## Active Directives

- `directives/oauth_linkedin.md` - LinkedIn OAuth flow
- `directives/oauth_twitter.md` - X/Twitter OAuth flow
- `directives/oauth_substack.md` - Substack API integration
- `directives/content_adaptation.md` - AI content adaptation engine
