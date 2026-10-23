import { NextRequest, NextResponse } from "next/server";
import { retrieveKnowledge } from "@/lib/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `You are Ashvamedha AI Insurance Analyst, an educational assistant for Indian insurance.
Use only the supplied retrieved context for factual claims about Indian rules or product-specific details.
Cite claims inline as [1], [2] matching the numbered sources provided. If the sources do not answer the question, say what is missing and do not guess.
Never invent premiums, returns, guaranteed benefits, policy clauses, tax outcomes, insurer APIs, or citations.
Clearly distinguish guaranteed contractual benefits from market-linked projections. Explain that ULIP illustrations are not assured returns.
Do not tell users to cancel or replace an existing policy. Flag surrender, underwriting, exclusions, waiting periods and loss of cover for human review.
Provide general education, not a definitive personalised recommendation. Ask only for information needed to clarify the question. Do not ask for Aadhaar, PAN, bank details, medical records or policy documents in this chat.
Keep answers concise, plain-language and useful. If information is stale, incomplete or conflicting, state that and recommend checking the latest official insurer document.`;

type Body = { message?: string; history?: Array<{ role: "user" | "assistant"; content: string }> };

export async function POST(request: NextRequest) {
  let body: Body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  if (!message) return NextResponse.json({ error: "Please enter a question." }, { status: 400 });

  const history = Array.isArray(body.history)
    ? body.history.filter(x => x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string")
        .slice(-6).map(x => ({ role: x.role, content: x.content.slice(0, 1200) }))
    : [];
  const sources = retrieveKnowledge(message, 4);
  const sourceBlock = sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.sourceName}. ${s.summary} Source: ${s.url} (index checked ${s.checkedAt}; confirm current version).`).join("\n");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const answer = sources.length
      ? `I can give a starting point, but this prototype currently uses keyword retrieval rather than a live AI model.\n\n${sources.map((s, i) => `**${i + 1}. ${s.title}**\n${s.summary} [${i + 1}]`).join("\n\n")}\n\nFor exact premiums, benefits or tax eligibility, we need the current official document for the specific product.\n\n**Sources**\n${sources.map((s, i) => `[${i + 1}] [${s.sourceName}](${s.url})`).join("\n")}`
      : "I don't have a sufficiently relevant source in the current prototype knowledge base to answer this reliably. Please ask a more specific question or have the team add a verified official source. I won't guess.";
    return NextResponse.json({ answer, sources: sources.map(s => ({ title: s.title, sourceName: s.sourceName, url: s.url, checkedAt: s.checkedAt })), mode: "retrieval-fallback" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.2,
        max_tokens: 650,
        messages: [
          { role: "system", content: SYSTEM + "\n\nRetrieved context:\n" + (sourceBlock || "No matching verified source found. State this limitation.") },
          ...history,
          { role: "user", content: message }
        ]
      }),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) {
      return NextResponse.json({ error: "The AI service is temporarily unavailable. Please try again." }, { status: 502 });
    }
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) return NextResponse.json({ error: "No answer was returned." }, { status: 502 });
    return NextResponse.json({
      answer,
      sources: sources.map((s, i) => ({ citation: i + 1, title: s.title, sourceName: s.sourceName, url: s.url, checkedAt: s.checkedAt })),
      mode: "ai-with-retrieval"
    });
  } catch {
    return NextResponse.json({ error: "The AI service timed out or could not be reached." }, { status: 502 });
  }
}