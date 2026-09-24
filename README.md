# Sumit's Content Engine

Type a random idea into Telegram. Get back 2 LinkedIn drafts in your voice. You review, edit and post yourself.

```
You (Telegram) -> Vercel webhook -> Gemini scores the idea (0-10)
     -> below 6: "parked", with the reason
     -> 6 or above: Gemini (or Claude) writes Draft A + Draft B using voice-skill.txt
     -> both drafts arrive back in your Telegram chat
```

## What's in this folder
| File | What it does |
|---|---|
| `voice-skill.txt` | How you write. Edit this any time to change the drafts. |
| `api/webhook.js` | Receives your Telegram messages and sends drafts back |
| `lib/pipeline.js` | The scoring and drafting prompts |
| `lib/llm.js` | Talks to Gemini / Claude |
| `lib/telegram.js` | Sends messages to Telegram |
| `.env.example` | The list of keys you need (names only, no real values) |

## Setup (about 20 minutes)

### 1. Get your keys
- **Telegram bot token**: from @BotFather (you already have this).
- **Gemini API key**: aistudio.google.com, then "Get API key". It's free.
- **Webhook secret**: make up a long password, letters and numbers only, e.g. `sumitEngine2026xYz91`.
- *(Optional)* **Claude API key**: console.anthropic.com. If added, Claude writes the drafts. It's usually better at holding your voice, but it's paid.

Keep these private. Don't paste them into chats, GitHub, or screenshots.

### 2. Put the code on GitHub
Create a new **private** repository and upload everything in this folder.
`.gitignore` already keeps secrets out.

### 3. Deploy on Vercel
1. vercel.com, then Add New, then Project, then import your repository.
2. Before clicking Deploy, open **Environment Variables** and add:
   - `TELEGRAM_BOT_TOKEN`
   - `GEMINI_API_KEY`
   - `TELEGRAM_WEBHOOK_SECRET`
   - (optional) `ANTHROPIC_API_KEY`
3. Deploy. Copy your URL, e.g. `https://sumit-content-engine.vercel.app`.

### 4. Connect Telegram to Vercel
Paste this into your browser. Replace the three parts in brackets, and remove the brackets.
```
https://api.telegram.org/bot[BOT_TOKEN]/setWebhook?url=[VERCEL_URL]/api/webhook&secret_token=[WEBHOOK_SECRET]
```
You should see `"ok":true`.

### 5. Lock it to your chat
1. Send your bot any message. It replies: "your chat ID is 123456...".
2. In Vercel, add `TELEGRAM_CHAT_ID` with that number, then go to Deployments, open the latest one, and click Redeploy.
3. From now on the bot only works for you. It ignores everyone else, so no one can burn your API credits.

### 6. Test
- Send a real idea with a moment or number in it. You should get a score, Draft A, Draft B, and a pick.
- Send "buy milk". It should be parked with a reason.
- `/force <idea>` drafts even if the score is low.

## Changing things later
- **Drafts don't sound like you?** Edit `voice-skill.txt` on GitHub. Vercel redeploys automatically.
- **Too strict or too lenient?** Add `MIN_SCORE` in Vercel (default 6).
- **Model errors ("model not found")?** Set `GEMINI_DRAFT_MODEL` / `GEMINI_SCORING_MODEL` to a model listed in Google AI Studio.

## Next upgrades (from B1)
News angle with source + verify flag · Supabase memory with APPROVE / REJECT · voice-note transcription.
