#!/usr/bin/env bash
# Ring a number with the coach right now, via the live API. Usage: test-call.sh +447700900123
# Sends a Verify SMS to that number, so whoever owns it must read you the code.
set -euo pipefail
PHONE=${1:?phone number, e.g. +447700900123}
API=${API:-https://api-production-6d7fe.up.railway.app}
curl -s -X POST "$API/auth/request-code" -H 'Content-Type: application/json' -d "{\"phone\":\"$PHONE\"}" >/dev/null
read -r -p "Code texted to $PHONE: " CODE
TOKEN=$(curl -s -X POST "$API/auth/verify" -H 'Content-Type: application/json' -d "{\"phone\":\"$PHONE\",\"code\":\"$CODE\",\"timezone\":\"Europe/London\"}" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("token") or sys.exit("sign-in failed: "+str(d)))')
HAS_PROFILE=$(curl -s "$API/me" -H "Authorization: Bearer $TOKEN" | python3 -c 'import sys,json; print("yes" if json.load(sys.stdin)["user"]["profile"] else "no")')
if [ "$HAS_PROFILE" = "no" ]; then echo "That number has no profile yet — do onboarding in the app first, then rerun."; exit 1; fi
curl -s -X POST "$API/coach/call-now" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d '{"channels":["call"]}' | python3 -c 'import sys,json; d=json.load(sys.stdin); print("Ringing.", d.get("status"), "| brief:", (d.get("brief") or "")[:160])'
