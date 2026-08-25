#!/bin/sh
# One-shot Telegram wiring: stores both secrets and points the bot at this worker.
#
# The token is read from a prompt rather than an argument so it stays out of
# shell history and the process list.
#
#   sh worker/setup-telegram.sh

set -e
cd "$(dirname "$0")"

WORKER_URL="https://ethiotime-api.kalebwalelgne.workers.dev"

printf 'Bot token from @BotFather: '
stty -echo 2>/dev/null || true
read -r TOKEN
stty echo 2>/dev/null || true
printf '\n'

if [ -z "$TOKEN" ]; then
  echo "No token given." >&2
  exit 1
fi

echo "Checking the token..."
if ! curl -sf "https://api.telegram.org/bot$TOKEN/getMe" | grep -q '"ok":true'; then
  echo "Telegram rejected that token. Check it with @BotFather and try again." >&2
  exit 1
fi
curl -s "https://api.telegram.org/bot$TOKEN/getMe"
printf '\n'

# Invented here, never typed: it only has to match on both sides.
SECRET=$(openssl rand -hex 32)

echo "Storing secrets..."
printf '%s' "$TOKEN" | npx wrangler secret put TELEGRAM_TOKEN
printf '%s' "$SECRET" | npx wrangler secret put TELEGRAM_WEBHOOK_SECRET

echo "Pointing Telegram at the worker..."
curl -s "https://api.telegram.org/bot$TOKEN/setWebhook" \
  --data-urlencode "url=$WORKER_URL/api/telegram/webhook" \
  --data-urlencode "secret_token=$SECRET"
printf '\n'

echo "Webhook status:"
curl -s "https://api.telegram.org/bot$TOKEN/getWebhookInfo"
printf '\n'
