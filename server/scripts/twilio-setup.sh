#!/usr/bin/env bash
# One-shot Twilio wiring for Be More. Needs: `twilio login` done, `railway` linked.
# Usage: server/scripts/twilio-setup.sh [+44FROMNUMBER]
set -euo pipefail

echo "== Twilio account"
PROFILE_JSON=$(twilio profiles:list -o json)
ACCOUNT_SID=$(echo "$PROFILE_JSON" | python3 -c 'import sys,json; p=json.load(sys.stdin); a=[x for x in p if x.get("active")] or p; print(a[0]["accountSid"])')
echo "Account: $ACCOUNT_SID"

echo "== Numbers on the account"
twilio phone-numbers:list --properties phoneNumber,friendlyName,capabilities.voice,capabilities.sms
FROM=${1:-$(twilio phone-numbers:list -o json | python3 -c 'import sys,json; n=json.load(sys.stdin); v=[x for x in n if x.get("capabilities",{}).get("voice")]; print(v[0]["phoneNumber"] if v else "")')}
if [ -z "$FROM" ]; then echo "No voice-capable number found. Buy one: twilio phone-numbers:buy:mobile --country-code GB"; exit 1; fi
echo "Calling from: $FROM"

echo "== Verify service (SMS sign-in codes)"
VERIFY_SID=$(twilio api:verify:v2:services:list -o json | python3 -c 'import sys,json; s=[x for x in json.load(sys.stdin) if x.get("friendlyName")=="Be More"]; print(s[0]["sid"] if s else "")')
if [ -z "$VERIFY_SID" ]; then
  VERIFY_SID=$(twilio api:verify:v2:services:create --friendly-name "Be More" -o json | python3 -c 'import sys,json; print(json.load(sys.stdin)[0]["sid"])')
  echo "Created Verify service $VERIFY_SID"
else
  echo "Using Verify service $VERIFY_SID"
fi

echo "== Auth token"
AUTH_TOKEN=${TWILIO_AUTH_TOKEN:-}
if [ -z "$AUTH_TOKEN" ]; then
  read -r -s -p "Paste the Twilio Auth Token (console front page): " AUTH_TOKEN; echo
fi

echo "== Pushing to Railway (api service)"
railway variables -s api \
  --set "TWILIO_ACCOUNT_SID=$ACCOUNT_SID" \
  --set "TWILIO_AUTH_TOKEN=$AUTH_TOKEN" \
  --set "TWILIO_VERIFY_SID=$VERIFY_SID" \
  --set "TWILIO_FROM_NUMBER=$FROM" >/dev/null
echo "Set. Railway is redeploying the API."

echo "== Waiting for the API to report calls:true"
for i in $(seq 1 40); do
  if curl -s -m 8 https://api-production-6d7fe.up.railway.app/health | grep -q '"calls":true'; then
    curl -s https://api-production-6d7fe.up.railway.app/health; echo
    break
  fi
  sleep 10
done

cat <<MSG

Done. Sign-in now sends real SMS codes and the coach can ring phones.
Test call: sign in on the app with YOUR number, Settings → "Ring my phone".
Or from here:  server/scripts/test-call.sh +447700900123
MSG
