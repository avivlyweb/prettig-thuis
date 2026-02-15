---
name: base44-deploy
description: Deploy and manage Prettig Thuis on Base44 platform. Use when user says "deploy", "publish", "push to base44", "sync functions", "check deployment", "functions not working", or "update production". Handles function deployment, secrets management, site publishing, and deployment verification for Base44 web editor apps.
metadata:
  author: prettig-thuis
  version: 1.0.0
  category: deployment
---

# Base44 Deploy Skill

## Critical Context

Prettig Thuis runs on **Base44 web editor** (NOT a Backend Platform/CLI app). This distinction is essential — CLI deploy commands (`base44 functions deploy`) will NOT work for this app.

- **App URL**: `https://prettig-thuis-c7bc8a0f.base44.app`
- **App ID**: `68974a9a6279ac51c7bc8a0f`
- **Dashboard**: `https://app.base44.com/apps/68974a9a6279ac51c7bc8a0f/editor/workspace/overview`
- **Secrets page**: `https://app.base44.com/apps/68974a9a6279ac51c7bc8a0f/editor/workspace/secrets`
- **DO NOT use** the copy app (`6991e81547a1adbd64ae930e` / `prettig-thuis-copy-64ae930e`)

## Instructions

### Step 1: Determine What Needs Deploying

Check what has changed:

```bash
git status
git diff --name-only HEAD~1
```

Classify changes:
- **Frontend code** (`src/`): Requires site publish via Base44 editor
- **Serverless functions** (`functions/`): Requires function publish via Base44 editor
- **Knowledge assets** (`.json` files in root): May require re-upload via admin pages
- **Config only** (`package.json`, `vite.config.js`): Requires full rebuild + site publish

### Step 2: Deploy Functions (if changed)

IMPORTANT: Functions for this app are deployed through the **Base44 web editor UI**, not the CLI.

1. Direct the user to the Base44 editor: `https://app.base44.com/apps/68974a9a6279ac51c7bc8a0f/editor`
2. Navigate to the **Functions** section
3. Verify the function code matches the local git version
4. Click **Publish** in the editor

Available functions and their purposes:

| Function | Purpose | Required Secrets |
|---|---|---|
| `createOpenAISession` | Ephemeral token for WebRTC voice | `OPENAI_API_KEY` |
| `analyzeConversationForICF` | LLM-based ICF code detection | Base44 LLM integration |
| `generatePromptAudio` | TTS audio generation | `OPENAI_API_KEY` |
| `generateQuestAudio` | Quest audio + file upload | `OPENAI_API_KEY` |
| `upload*.ts` | Knowledge base data ingestion | Admin email auth |

### Step 3: Verify Function Deployment

Test the most critical function with curl:

```bash
# Test createOpenAISession (voice flow entry point)
curl -s -X POST \
  "https://prettig-thuis-c7bc8a0f.base44.app/functions/createOpenAISession" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool
```

Expected success response:
- HTTP 200
- JSON with `client_secret.value` (ephemeral token starting with `ek_`)
- `session.model` should be `gpt-realtime`

Common error responses:

| HTTP Code | Error Message | Fix |
|---|---|---|
| 500 | `OPENAI_API_KEY is not set in secrets` | Add key in Dashboard → Secrets |
| 500 | `Backend function not found or not deployed` | Publish function in Base44 editor |
| 504 | `OpenAI token request timed out` | Check OpenAI API status, may be transient |
| 404 | `App not found for this domain` | Wrong URL — use `prettig-thuis-c7bc8a0f.base44.app` |

### Step 4: Manage Secrets

Secrets are set via the Base44 dashboard, not via CLI or code.

Required secrets for voice features:

| Secret Name | Purpose | How to Get |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI Realtime API access | `https://platform.openai.com/api-keys` |
| `OPENAI_REALTIME_MODEL` | (Optional) Override model, default: `gpt-realtime` | — |
| `OPENAI_REALTIME_VOICE` | (Optional) Override voice, default: `alloy` | — |

To update secrets:
1. Go to `https://app.base44.com/apps/68974a9a6279ac51c7bc8a0f/editor/workspace/secrets`
2. Add or update the secret
3. Press **Publish** — secrets may require publishing to take effect

### Step 5: Deploy Frontend/Site (if changed)

For web editor apps, the frontend is managed through the Base44 editor:
1. If code was changed locally, it needs to be synced to the Base44 editor
2. Base44 may auto-sync from the connected git repo on push — verify after pushing
3. If not auto-synced, update the code in the Base44 editor manually
4. Click **Publish** in the editor

### Step 6: Post-Deploy Verification

Run full smoke test:

```bash
# 1. Test function endpoint
curl -s -w "\nHTTP: %{http_code}" -X POST \
  "https://prettig-thuis-c7bc8a0f.base44.app/functions/createOpenAISession" \
  -H "Content-Type: application/json" -d '{}'

# 2. Test site is accessible
curl -s -w "\nHTTP: %{http_code}" \
  "https://prettig-thuis-c7bc8a0f.base44.app" | head -5

# 3. Test ICF analysis function
curl -s -w "\nHTTP: %{http_code}" -X POST \
  "https://prettig-thuis-c7bc8a0f.base44.app/functions/analyzeConversationForICF" \
  -H "Content-Type: application/json" \
  -d '{"conversationText":"Patient zegt dat lopen moeilijk gaat","recentTranscript":"lopen gaat moeilijk"}'
```

## Git Workflow

The standard commit-and-push flow:

```bash
git add <changed-files>
git commit -m "Description of changes"
git push origin main
```

After pushing, verify if Base44 auto-synced by checking the editor. If not, manually update the editor code.

## Troubleshooting

### "This endpoint is only available for Backend Platform apps"
**Cause**: Trying to use `base44 functions deploy` CLI on a web editor app.
**Fix**: Deploy through the Base44 web editor UI instead. Do NOT use the CLI for this app.

### Functions work on copy but not original
**Cause**: Functions were deployed to the wrong app.
**Fix**: Always use app ID `68974a9a6279ac51c7bc8a0f`, not the copy `6991e81547a1adbd64ae930e`.

### Request stuck on "Pending"
**Cause**: Function not deployed, or wrong API domain being called.
**Fix**: Publish function in Base44 editor. The app calls `base44.app/api/apps/{id}/functions/...` internally.

### Base44 CLI link fails with "Project not found"
**Cause**: The app was created in the web editor, not via CLI. The project ID format differs.
**Fix**: For this app, use the web editor for all deployments. CLI linking only works for CLI-created apps.
