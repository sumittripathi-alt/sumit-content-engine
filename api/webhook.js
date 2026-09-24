// Telegram sends every new message here. We answer Telegram instantly,
// then do the slow AI work in the background and message the drafts back.
import { waitUntil } from "@vercel/functions";
import { sendMessage } from "../lib/telegram.js";
import { scoreNote, writeDrafts, MIN_SCORE } from "../lib/pipeline.js";

const HELP = `Send me any raw idea as a text message.
I'll score it, and if it's worth a post, send back 2 LinkedIn drafts in your voice.

/force <idea>  skip the score check and draft anyway
/help          show this message

Nothing is ever posted for you. You review, edit, and post yourself.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("Content engine is running.");

  // Only accept requests that really come from Telegram
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return res.status(401).send("Unauthorized");
  }

  const update = req.body || {};
  const msg = update.message || update.channel_post;
  if (msg && !msg.from?.is_bot) waitUntil(handleMessage(msg)); // slow work continues in the background
  return res.status(200).json({ ok: true }); // tell Telegram "got it" right away
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  try {
    // Only work for YOUR chat. Until TELEGRAM_CHAT_ID is set, tell the sender their ID.
    const allowed = (process.env.TELEGRAM_CHAT_ID || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (allowed.length === 0) {
      await sendMessage(chatId, `Setup step: your chat ID is ${chatId}\nAdd it in Vercel as TELEGRAM_CHAT_ID, then redeploy.`);
      return;
    }
    if (!allowed.includes(String(chatId))) return; // ignore strangers silently

    const text = (msg.text || "").trim();
    if (!text) {
      await sendMessage(chatId, "I can only read typed text for now. Type the idea out and send it again.");
      return;
    }
    if (text === "/start" || text === "/help") return sendMessage(chatId, HELP);

    let note = text;
    let force = false;
    if (text.startsWith("/force")) {
      note = text.replace(/^\/force(@\w+)?/, "").trim();
      force = true;
      if (!note) return sendMessage(chatId, "Add the idea after /force, like: /force my idea here");
    } else if (text.startsWith("/")) {
      return sendMessage(chatId, HELP);
    }

    // Step 1: score the idea
    const { score, reason, wowFactor } = await scoreNote(note);
    if (score < MIN_SCORE && !force) {
      await sendMessage(
        chatId,
        `Parked (${score}/10): ${reason}\n\nNo draft made. Add a real moment, number or twist and send again, or use /force to draft anyway.`
      );
      return;
    }
    await sendMessage(chatId, `Score ${score}/10: ${reason}\nWriting 2 drafts...`);

    // Step 2: write two drafts in Sumit's voice
    const { drafts, raw } = await writeDrafts(note, wowFactor);
    if (!drafts) {
      await sendMessage(chatId, `Drafts came back in an odd format. Raw output:\n\n${raw}`);
      return;
    }

    const header = (label, d) => `DRAFT ${label}  ·  ${d.emotion || "?"}  ·  ${d.hook || "?"} hook\n──────────────\n\n`;
    await sendMessage(chatId, header("A", drafts.a) + drafts.a.text);
    await sendMessage(chatId, header("B", drafts.b) + drafts.b.text);
    await sendMessage(
      chatId,
      `${drafts.pick ? "Pick: " + drafts.pick + "\n\n" : ""}Check every [ADD DETAIL] and every fact before posting. You're the author.`
    );
  } catch (err) {
    console.error(err);
    await sendMessage(chatId, `Something broke: ${err.message}`).catch(() => {});
  }
}
