// The content engine: score the idea, then write two LinkedIn drafts in Sumit's voice.
import fs from "node:fs";
import path from "node:path";
import { callGemini, callClaude } from "./llm.js";

const VOICE_SKILL = fs.readFileSync(path.join(process.cwd(), "voice-skill.txt"), "utf8");

const SCORING_MODEL = process.env.GEMINI_SCORING_MODEL || "gemini-3.5-flash-lite";
const GEMINI_DRAFT_MODEL = process.env.GEMINI_DRAFT_MODEL || "gemini-3.6-flash";
const CLAUDE_DRAFT_MODEL = process.env.CLAUDE_DRAFT_MODEL || "claude-sonnet-5";
const MIN_SCORE = Number(process.env.MIN_SCORE || 6);

const SCORING_SYSTEM = `You screen raw ideas for Sumit Tripathi's LinkedIn. He is an operator and founder who writes story-led posts with one sharp insight.
Score the note from 0 to 10 on whether it can become a strong LinkedIn post.
High (7-10): contains a real moment, a specific number, or a counterintuitive observation that could anchor a post.
Middle (4-6): an interesting angle, but thin; needs detail.
Low (0-3): a task, reminder, shopping list, link with no thought, or a fragment with no point.
Be strict. Most random notes are not posts.
Respond ONLY with JSON: {"score": <integer 0-10>, "reason": "<one line>", "wow_factor": "<the single strongest element, or 'none'>"}`;

export async function scoreNote(note) {
  const raw = await callGemini({
    model: SCORING_MODEL,
    system: SCORING_SYSTEM,
    user: `Note:\n"""${note}"""`,
    json: true,
    temperature: 0.2,
  });
  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  return {
    score: Math.max(0, Math.min(10, Math.round(Number(parsed.score) || 0))),
    reason: String(parsed.reason || "").trim(),
    wowFactor: String(parsed.wow_factor || "none").trim(),
  };
}

function draftingRequest(note, wowFactor) {
  return `Raw idea from Sumit:
"""${note}"""

Strongest element spotted by the screener: ${wowFactor}

Write TWO different LinkedIn drafts of this idea, following every rule in your instructions.
Draft A and Draft B must use DIFFERENT hook types (for example one anecdotal, one data- or contrast-led) and DIFFERENT core emotions.
Each draft: 120-250 words, ends with a comment-worthy line and one short invitation to comment.
Mark any missing fact with [ADD DETAIL] instead of inventing it.

Output EXACTLY in this format and nothing else:
===DRAFT A===
EMOTION: <one of Controversial, Humor, Mystery, Inspiration, Sarcasm>
HOOK TYPE: <anecdotal / data-led / contrast>
<the post text>
===DRAFT B===
EMOTION: <...>
HOOK TYPE: <...>
<the post text>
===PICK===
<one line: which draft is stronger and why>`;
}

export function parseDrafts(raw) {
  const grab = (label, next) => {
    const re = new RegExp(`===${label}===([\\s\\S]*?)(?====${next}===|$)`);
    return (raw.match(re)?.[1] || "").trim();
  };
  const parseOne = (block) => {
    const emotion = block.match(/^EMOTION:\s*(.+)$/im)?.[1]?.trim() || "";
    const hook = block.match(/^HOOK TYPE:\s*(.+)$/im)?.[1]?.trim() || "";
    const text = block
      .replace(/^EMOTION:.*$/im, "")
      .replace(/^HOOK TYPE:.*$/im, "")
      .trim();
    return { emotion, hook, text };
  };
  const a = parseOne(grab("DRAFT A", "DRAFT B"));
  const b = parseOne(grab("DRAFT B", "PICK"));
  const pick = grab("PICK", "END");
  if (!a.text || !b.text) return null;
  return { a, b, pick };
}

export async function writeDrafts(note, wowFactor) {
  const useClaude =
    (process.env.DRAFT_PROVIDER || (process.env.ANTHROPIC_API_KEY ? "claude" : "gemini")) === "claude";
  const args = { system: VOICE_SKILL, user: draftingRequest(note, wowFactor) };
  const raw = useClaude
    ? await callClaude({ model: CLAUDE_DRAFT_MODEL, ...args })
    : await callGemini({ model: GEMINI_DRAFT_MODEL, ...args });
  return { drafts: parseDrafts(raw), raw, model: useClaude ? CLAUDE_DRAFT_MODEL : GEMINI_DRAFT_MODEL };
}

export { MIN_SCORE };
