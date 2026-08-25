# ethiotime-api

The backend for the parts of ethiotime that cannot live on the device: shared
note links, Telegram reminders, and the shared Amharic dictionary. The site
itself stays a static export on GitHub Pages and talks to this over HTTPS.

## Setup

```sh
cd worker
npm install
npx wrangler login

npx wrangler d1 create ethiotime      # put the id it prints into wrangler.toml
npm run schema                        # or `npm run schema:local` for wrangler dev

npx wrangler secret put TELEGRAM_TOKEN            # from @BotFather
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET   # any random string

npm run deploy
```

Then point Telegram at the deployed worker, using the same secret:

```sh
curl "https://api.telegram.org/bot$TELEGRAM_TOKEN/setWebhook" \
  -d url=https://ethiotime-api.<subdomain>.workers.dev/api/telegram/webhook \
  -d secret_token=$TELEGRAM_WEBHOOK_SECRET
```

Finally build the site with the worker's URL so the features switch on. Without
it `hasApi()` is false and the app hides all three:

```sh
NEXT_PUBLIC_API_URL=https://ethiotime-api.<subdomain>.workers.dev npm run build
```

`APP_URL` and `TELEGRAM_BOT` in `wrangler.toml` need to match the deployed site
and the bot's username: the first is the CORS allowlist and where short links
redirect to, the second is the `t.me` link shown in the planner.

## Endpoints

| Method | Path | |
| --- | --- | --- |
| POST | `/api/notes` | store a note, get back a six character id |
| GET | `/api/notes/:id` | read one |
| DELETE | `/api/notes/:id` | needs the `X-Edit-Token` from the create call |
| GET | `/:id` | the short link, redirects into the app |
| POST | `/api/planner/link` | start linking a device to a Telegram chat |
| GET | `/api/planner/link?token=` | has it been linked yet |
| DELETE | `/api/planner/link` | unlink, and drop the pending reminders |
| PUT | `/api/planner/reminders` | replace this device's upcoming reminders |
| POST | `/api/telegram/webhook` | Telegram calls this |
| GET | `/api/words?since=` | dictionary words added since a cursor |
| POST | `/api/words` | report words typed on a device |

## Notes on the design

The cron runs every minute, so a reminder lands within about a minute of its
time. It was five minutes to begin with, which made "At start" reminders arrive
after the event had already begun.

Occurrences are worked out on the device and pushed here as plain timestamps.
The Ethiopian calendar maths and the user's timezone both live in the app, and
duplicating either in the worker would be two implementations to keep in step.

A contributed word only reaches other devices once three separate devices have
reported it, which is what keeps one person's typo out of everyone's keyboard.

Shared notes are swept 180 days after they are created. A link is a handoff, not
storage: the note itself stays on the device that made it.
