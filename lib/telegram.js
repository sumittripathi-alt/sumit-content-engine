// Sends messages back to Telegram. Plain text only, so special characters never break formatting.

const LIMIT = 4000; // Telegram's hard limit is 4096 characters per message

export async function sendMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing in Vercel environment variables.");

  const chunks = [];
  for (let i = 0; i < text.length; i += LIMIT) chunks.push(text.slice(i, i + LIMIT));

  for (const chunk of chunks) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk, disable_web_page_preview: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(`Telegram error (${res.status}): ${data?.description || "unknown"}`);
    }
  }
}
