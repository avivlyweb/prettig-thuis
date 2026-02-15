---
name: voice-session-debug
description: Diagnose and fix voice session issues in Prettig Thuis. Use when user says "voice not working", "realtime broken", "session failing", "can't hear", "microphone not working", "WebRTC error", "ephemeral token", or "connection failed". Runs systematic diagnostics on the OpenAI Realtime API + WebRTC + Base44 function pipeline.
metadata:
  author: prettig-thuis
  version: 1.0.0
  category: debugging
---

# Voice Session Debug Skill

## Architecture Overview

The voice flow has 4 layers that can each fail independently:

```
Layer 1: Base44 Function    → createOpenAISession (Deno serverless)
Layer 2: OpenAI API         → Ephemeral token + session creation
Layer 3: WebRTC Connection  → SDP exchange + audio stream
Layer 4: Browser            → Microphone permission + audio playback
```

## Instructions

### Step 1: Test Layer 1 — Base44 Function

Run this diagnostic first — it's the most common failure point:

```bash
curl -s -w "\nHTTP: %{http_code}" -X POST \
  "https://prettig-thuis-c7bc8a0f.base44.app/functions/createOpenAISession" \
  -H "Content-Type: application/json" -d '{}'
```

**Diagnose the response:**

| Response | Problem | Fix |
|---|---|---|
| HTTP 200 + `client_secret.value` | Layer 1 OK | Continue to Layer 2 |
| HTTP 500 + `OPENAI_API_KEY is not set` | Missing secret | Add key in Base44 Dashboard → Secrets |
| HTTP 500 + `Backend function not found` | Function not deployed | Publish in Base44 web editor (NOT CLI) |
| HTTP 504 + `timed out` | OpenAI slow/down | Retry in 30s, check OpenAI status page |
| HTTP 404 + `App not found` | Wrong URL/domain | Must use `prettig-thuis-c7bc8a0f.base44.app` |
| Connection refused / DNS error | App offline | Check Base44 platform status |
| Hangs indefinitely | Function deployed but stuck | Check Base44 function logs in editor |

### Step 2: Validate Layer 2 — OpenAI Session

If Layer 1 returned HTTP 200, examine the response body:

```bash
# Pretty-print the full response
curl -s -X POST \
  "https://prettig-thuis-c7bc8a0f.base44.app/functions/createOpenAISession" \
  -H "Content-Type: application/json" -d '{}' | python3 -m json.tool
```

**Verify these fields:**

| Field | Expected Value | If Wrong |
|---|---|---|
| `client_secret.value` | Starts with `ek_` | Token format changed — check OpenAI API docs |
| `session.model` | `gpt-realtime` | Set `OPENAI_REALTIME_MODEL` secret |
| `session.audio.output.voice` | `alloy` (or configured) | Set `OPENAI_REALTIME_VOICE` secret |
| `expires_at` | Unix timestamp > current time | Token already expired — clock sync issue |

**Token normalization check:**

The function normalizes the response at line 64-66 of `createOpenAISession.ts`:
```javascript
const normalizedData = data?.value
  ? { ...data, client_secret: { value: data.value } }
  : data;
```

If the response has `value` at top level but no `client_secret.value`, normalization is working. If neither exists, the OpenAI API response format changed.

### Step 3: Test Layer 3 — WebRTC SDP Exchange

The frontend exchanges SDP with OpenAI directly (not through Base44). Test if the ephemeral token works:

```bash
# Get a fresh token
TOKEN=$(curl -s -X POST \
  "https://prettig-thuis-c7bc8a0f.base44.app/functions/createOpenAISession" \
  -H "Content-Type: application/json" -d '{}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(d.get('client_secret',{}).get('value') or d.get('value','NO_TOKEN'))
")

echo "Token: $TOKEN"

# Test SDP endpoint reachability (won't complete without real SDP, but verifies auth)
curl -s -w "\nHTTP: %{http_code}" \
  "https://api.openai.com/v1/realtime/calls" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/sdp" \
  -d "v=0" 2>&1 | tail -3
```

Expected: HTTP 400 (bad SDP) is actually good — it means auth works. HTTP 401/403 means token is invalid.

### Step 4: Check Layer 4 — Browser Issues

These can't be tested from CLI. Guide the user through browser DevTools:

1. **Open DevTools** → Console tab
2. **Click "Start Assistent"** and watch for:
   - `[RealtimeVoice2.0] Sessie token aanvragen...` → Function is being called
   - `Full createOpenAISession response:` → Check the logged response
   - `[RealtimeVoice2.0] WebRTC verbinding opstarten...` → Token received OK
   - `[RealtimeVoice2.0] Microfoon toegang verkrijgen...` → WebRTC starting
   - `[RealtimeVoice2.0] Data kanaal geopend` → Success!

**Common browser issues:**

| Console Error | Cause | Fix |
|---|---|---|
| `NotAllowedError: Permission denied` | Mic blocked | Browser settings → allow microphone for this site |
| `NotFoundError: Requested device not found` | No mic available | Check system audio settings, try different browser |
| `Failed to execute 'getUserMedia'` | Insecure context | Must be HTTPS (base44.app is HTTPS, localhost needs special handling) |
| `RTCPeerConnection` errors | WebRTC blocked | Try Chrome/Edge (best WebRTC support), disable VPN |
| `SDP Response error: 401` | Token expired | Token TTL is 60 seconds — is the session creation too slow? |
| `Sessie token fout:` | Function returned error | Check Layer 1 output |

### Step 5: Runtime Issue Diagnostics

If the session starts but has problems during use:

**No audio from assistant:**
- Check `audioPlayer.autoplay = true` — some browsers block autoplay
- User may need to interact with page first (click anywhere) before audio plays
- Check if `pc.ontrack` fires — look for "Audio stream ontvangen" in console

**Assistant doesn't hear user:**
- Check mic input in browser: `chrome://settings/content/microphone`
- Audio config: `echoCancellation: true, noiseSuppression: true, sampleRate: 16000`
- VAD threshold is 0.5 with 1000ms silence — user may need to speak louder/longer

**Session disconnects:**
- 12-second timeout in function — OpenAI may be slow
- WebRTC ICE candidates may fail behind strict firewalls
- Check `pc.connectionState` in console — look for "failed" or "disconnected"

**ICF detection not working:**
- Voice works but no ICF codes detected
- Check if `analyzeConversationForICF` function is deployed
- Test independently:
```bash
curl -s -X POST \
  "https://prettig-thuis-c7bc8a0f.base44.app/functions/analyzeConversationForICF" \
  -H "Content-Type: application/json" \
  -d '{"conversationText":"Patient zegt dat lopen moeilijk gaat en bang is om te vallen","recentTranscript":"lopen gaat moeilijk en ik ben bang om te vallen"}'
```

## Known Base44 Deno Runtime Limitations

- `AbortSignal.timeout()` is NOT supported — use `AbortController` with `setTimeout` instead
- Function execution timeout may be shorter than expected — keep operations under 12 seconds
- `Deno.env.get()` for secrets — secrets must be set in Base44 Dashboard → Secrets

## Quick Diagnostic Script

Run this all-in-one check:

```bash
echo "=== Prettig Thuis Voice Diagnostics ==="
echo ""
echo "1. Testing function endpoint..."
RESULT=$(curl -s -w "|||%{http_code}" -X POST \
  "https://prettig-thuis-c7bc8a0f.base44.app/functions/createOpenAISession" \
  -H "Content-Type: application/json" -d '{}')
BODY=$(echo "$RESULT" | sed 's/|||.*//')
HTTP=$(echo "$RESULT" | sed 's/.*|||//')
echo "   HTTP: $HTTP"

if [ "$HTTP" = "200" ]; then
  echo "   Function: OK"
  TOKEN=$(echo "$BODY" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('client_secret',{}).get('value','')or d.get('value',''))" 2>/dev/null)
  if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
    echo "   Token: ${TOKEN:0:20}... (valid)"
    echo "   Model: $(echo "$BODY" | python3 -c "import json,sys;print(json.load(sys.stdin).get('session',{}).get('model','unknown'))" 2>/dev/null)"
    echo ""
    echo "2. Testing OpenAI SDP endpoint..."
    SDP_HTTP=$(curl -s -w "%{http_code}" -o /dev/null \
      "https://api.openai.com/v1/realtime/calls" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/sdp" -d "v=0")
    echo "   SDP endpoint HTTP: $SDP_HTTP"
    if [ "$SDP_HTTP" = "400" ] || [ "$SDP_HTTP" = "200" ]; then
      echo "   Auth: OK (token accepted)"
    else
      echo "   Auth: FAILED (token rejected)"
    fi
  else
    echo "   Token: MISSING in response"
  fi
else
  echo "   Function: FAILED"
  echo "   Error: $BODY"
fi

echo ""
echo "3. Testing ICF analysis function..."
ICF_HTTP=$(curl -s -w "%{http_code}" -o /dev/null -X POST \
  "https://prettig-thuis-c7bc8a0f.base44.app/functions/analyzeConversationForICF" \
  -H "Content-Type: application/json" \
  -d '{"conversationText":"test","recentTranscript":"test"}')
echo "   ICF function HTTP: $ICF_HTTP"

echo ""
echo "=== Diagnostics Complete ==="
```

## Escalation

If all layers pass but voice still doesn't work:
1. Try a different browser (Chrome recommended)
2. Try incognito mode (rules out extensions)
3. Check if the user is on a network that blocks WebRTC (corporate firewalls, some VPNs)
4. Check OpenAI platform status: `https://status.openai.com`
5. Review Base44 function logs in the editor dashboard
