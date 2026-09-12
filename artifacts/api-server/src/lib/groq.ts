import { logger } from "./logger";

type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

const extractUrl = (message: string) => message.match(/https?:\/\/[^\s]+/i)?.[0];

async function fetchPage(url: string) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    const response = await fetch(parsed, { signal: AbortSignal.timeout(7000) });
    const html = await response.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);
  } catch (error) {
    logger.warn({ error }, "Unable to fetch requested page");
    return "";
  }
}

export async function generateAssistantReply(message: string, context: ChatTurn[] = [], userLabel = "guest") {
  const url = extractUrl(message);
  const page = url ? await fetchPage(url) : "";
  const system = `You are Regieren AI. Reply concisely in Markdown. User: ${userLabel}. If the user asks about premium files, tell them to use /claim <serial>. ${page ? `The user asked about ${url}. Use this page text as context: ${page}` : ""}`;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return page
      ? `I fetched **${url}**. The page contains ${page.slice(0, 420)}${page.length > 420 ? "…" : ""}`
      : "I’m ready. Add a Groq API key to enable live assistant responses.";
  }
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        messages: [{ role: "system", content: system }, ...context.slice(-12), { role: "user", content: message }],
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (!response.ok) {
      logger.warn({ status: response.status, providerError: data.error?.message }, "Groq request failed");
      throw new Error(`Groq returned ${response.status}`);
    }
    return data.choices?.[0]?.message?.content || "I couldn't generate a response.";
  } catch (error) {
    logger.warn({ error }, "Groq request failed");
    return "The assistant is temporarily unavailable. Please try again in a moment.";
  }
}

export { fetchPage };