// Visit /api/setup once to connect Telegram to this project.
// It uses the keys already saved in Vercel, so no one has to paste a token into a link.
export default async function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token) return res.status(500).send("TELEGRAM_BOT_TOKEN is missing in Vercel. Add it, redeploy, then open this page again.");
  if (secret && !/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
    return res.status(500).send("TELEGRAM_WEBHOOK_SECRET can only use letters, numbers, _ and -. Change it in Vercel, redeploy, then open this page again.");
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const url = `https://${host}/api/webhook`;
  const body = { url, allowed_updates: ["message", "channel_post"], drop_pending_updates: true };
  if (secret) body.secret_token = secret;

  try {
    const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json());
    if (!me.ok) return res.status(500).send(`Telegram rejected the bot token (${me.description}). Paste the newest BotFather token into Vercel, redeploy, and try again.`);

    const set = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());
    if (!set.ok) return res.status(500).send(`Telegram said: ${set.description}`);

    return res.status(200).send(`Connected! @${me.result.username} now sends messages to ${url}\nGo to Telegram and send your bot "hi".`);
  } catch (err) {
    return res.status(500).send(`Could not reach Telegram: ${err.message}`);
  }
}
