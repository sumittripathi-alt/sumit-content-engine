// Talks to the AI models. Gemini is the default; Claude is optional for drafting.

export async function callGemini({ model, system, user, json = false, temperature = 0.9 }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing in Vercel environment variables.");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature,
          ...(json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error (${res.status}): ${data?.error?.message || "unknown"}`);

  const text = (data?.candidates?.[0]?.content?.parts || [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

export async function callClaude({ model, system, user, temperature = 0.9 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is missing in Vercel environment variables.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2500,
      temperature,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Claude error (${res.status}): ${data?.error?.message || "unknown"}`);

  const text = (data?.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (!text) throw new Error("Claude returned an empty response.");
  return text;
}
