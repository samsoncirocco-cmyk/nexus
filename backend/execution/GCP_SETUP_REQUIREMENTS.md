# GCP Setup Requirements for OpenClaw Phase 1

## Status
🔴 **BLOCKED**: Waiting for user GCP project setup

## What You Need to Do

### Step 1: Create a GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project selector at the top
3. Click "NEW PROJECT"
4. Enter project name: `openclaw` (or your preference)
5. Click "CREATE"
6. Wait for project to be created (2-3 minutes)
7. **Save your Project ID** (you'll need this)

### Step 2: Enable Required APIs

In the GCP Console, enable these APIs:

```
1. BigQuery API
2. Cloud Functions API
3. Cloud Pub/Sub API
4. Cloud Tasks API
5. Gmail API
6. Google Sheets API
7. Google Drive API
8. Cloud Logging API
```

**How to enable**:
1. Go to APIs & Services → Library
2. Search for each API above
3. Click "ENABLE" button

### Step 3: Create a Service Account

1. Go to APIs & Services → Credentials
2. Click "CREATE CREDENTIALS" → "Service Account"
3. Fill in:
   - Service account name: `openclaw-service`
   - Description: "Service account for OpenClaw data pipeline"
4. Click "CREATE AND CONTINUE"
5. Grant these roles:
   - ✅ BigQuery Admin
   - ✅ Cloud Functions Developer
   - ✅ Pub/Sub Admin
   - ✅ Cloud Tasks Admin
   - ✅ Editor (for now, can restrict later)
6. Click "CONTINUE" then "DONE"

### Step 4: Create and Download Service Account Key

1. Go to APIs & Services → Service Accounts
2. Click the service account you just created
3. Go to "KEYS" tab
4. Click "ADD KEY" → "Create new key"
5. Choose "JSON" format
6. Click "CREATE"
7. A JSON file will download
8. **Save this file securely** (it has credentials)

### Step 5: Configure Local Environment

```bash
# Set your project ID
export GOOGLE_PROJECT_ID="your-project-id-here"

# Set the service account key path
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Verify credentials are set
echo $GOOGLE_PROJECT_ID
echo $GOOGLE_APPLICATION_CREDENTIALS
```

### Step 6: Install Google Cloud CLI

```bash
# macOS (using Homebrew)
brew install --cask google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Windows
# Download from: https://cloud.google.com/sdk/docs/install-sdk#windows

# After installation, authenticate
gcloud auth login
gcloud config set project $GOOGLE_PROJECT_ID
```

### Step 7: Verify Setup

```bash
# Check project is set
gcloud config get-value project

# Check authentication
gcloud auth list

# Test BigQuery access
bq ls

# You should see (possibly empty) list of datasets
```

## What Happens Next

Once you complete the above setup and confirm, the team will:

1. **bigquery-architect** will run these commands:
   ```bash
   bq query --use_legacy_sql=false < bigquery_setup.sql
   bq ls -t openclaw
   bq query --use_legacy_sql=false < bigquery_test_data.sql
   ```
   This creates the `openclaw` dataset with 3 tables and 4 views.

2. **sheets-builder** will create the Google Sheet with 4 tabs.

3. **cloud-integrator** will deploy Cloud Functions:
   - gmail_ingester: Receives Gmail webhooks
   - event_router: Routes events to agents

## Files Ready for Deployment

All BigQuery files are ready in `/Users/maryobrien/project/execution/`:

- `bigquery_setup.sql` - Create dataset and tables
- `bigquery_setup.py` - Create external tables
- `bigquery_test_data.sql` - Load sample data

Documentation:
- `BIGQUERY_DELIVERY.md` - What was delivered
- `DEPLOY_BIGQUERY.md` - How to deploy
- `BIGQUERY_IMPLEMENTATION.md` - Complete reference

## Troubleshooting

### "gcloud: command not found"
```bash
# Install Google Cloud SDK
# See Step 6 above
```

### "Access Denied" when running `bq ls`
```bash
# Re-authenticate
gcloud auth application-default login
```

### "Project ID not set"
```bash
# Set project ID
gcloud config set project $GOOGLE_PROJECT_ID

# Verify
gcloud config get-value project
```

### Can't find service account key file
```bash
# Create a new one from GCP Console:
# APIs & Services → Service Accounts → [account] → Keys → Add Key
```

## Cost Estimate

The setup is designed to run on **Google Cloud free tier**:

- ✅ BigQuery: 1 TB/month queries free
- ✅ Cloud Functions: 2M invocations/month free
- ✅ Pub/Sub: 10 GB/month free
- ✅ Cloud Tasks: 100k tasks/month free
- ✅ Gmail/Sheets APIs: Free

**Total estimated cost**: $0-5/month for personal use

## Security Notes

⚠️ **Important**:
- Never commit the service account key to git
- Add to `.gitignore`:
  ```
  service-account-key.json
  google-credentials.json
  ```
- Store key securely (password manager recommended)
- Rotate keys periodically (quarterly minimum)

## What to Tell the Team

Once you've completed the setup above, message the team-lead:

```
GCP setup complete:
- Project ID: [your-project-id]
- Service account: openclaw-service
- APIs enabled: BigQuery, Cloud Functions, Pub/Sub, Cloud Tasks, Gmail, Sheets, Drive, Logging
- Environment variables configured

Ready to deploy Phase 1 infrastructure.
```

## Help

If you get stuck:
1. Check Google Cloud docs: https://cloud.google.com/docs
2. Check BigQuery guide: `/Users/maryobrien/project/execution/BIGQUERY_IMPLEMENTATION.md`
3. Message the team-lead with the error message

## Timeline

Estimated time to complete: **15-20 minutes**

Once complete, Phase 1 infrastructure deployment will take another **5-10 minutes**.

---

**Status**: ⏳ Waiting for user GCP setup
**Next Action**: Complete setup above, then message team-lead
**Target**: Have data flowing into BigQuery within 1-2 hours of GCP setup
