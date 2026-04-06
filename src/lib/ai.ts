import OpenAI from "openai";
import type {
  StructuredAssumption,
  EvidenceSuggestion,
  Assumption,
  EvidenceEntry,
} from "./types";

let _openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const STRUCTURING_MODEL = "gpt-4o";
const UTILITY_MODEL = "gpt-4o-mini";

export async function structureAssumption(
  rawText: string
): Promise<StructuredAssumption> {
  const response = await getClient().chat.completions.create({
    model: STRUCTURING_MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a structured thinking assistant for thesis-driven investors. Given raw text about a market thesis, extract:
1. "belief": A one-sentence statement of the core belief (max 500 chars)
2. "causal_logic": The causal reasoning in IF/THEN/BECAUSE format (max 1000 chars). Example: "IF Russia-Ukraine conflict persists AND OPEC maintains discipline THEN oil stays above $85 BECAUSE supply constraints create a price floor"
3. "invalidation_conditions": An array of 2-5 specific, measurable conditions that would prove this thesis wrong. Each should be concrete enough to evaluate objectively.
4. "confidence": An integer 1-10 rating how confident this thesis is based on the reasoning provided.

If the text is not an investment thesis or market view, return: {"error": "no_thesis", "message": "Could not identify an investment thesis in this text."}

Return valid JSON only.`,
      },
      { role: "user", content: rawText.slice(0, 10000) },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  const parsed = JSON.parse(content);
  if (parsed.error === "no_thesis") {
    const err = new Error(parsed.message || "No thesis detected in input");
    err.name = "NoThesisError";
    throw err;
  }

  // Validate LLM output shape before returning
  if (typeof parsed.belief !== "string" || !parsed.belief) {
    throw new Error("AI returned invalid belief field");
  }
  if (!Array.isArray(parsed.invalidation_conditions) || parsed.invalidation_conditions.length === 0) {
    throw new Error("AI returned invalid invalidation_conditions");
  }

  return {
    belief: String(parsed.belief).slice(0, 500),
    causal_logic: String(parsed.causal_logic || "").slice(0, 1000),
    invalidation_conditions: parsed.invalidation_conditions
      .filter((c: unknown) => typeof c === "string" && c.trim())
      .slice(0, 10),
    confidence: Math.min(10, Math.max(1, Math.round(Number(parsed.confidence) || 5))),
  };
}

export async function categorizeEvidence(
  text: string,
  assumption: Pick<Assumption, "belief" | "causal_logic" | "invalidation_conditions">
): Promise<EvidenceSuggestion> {
  const response = await getClient().chat.completions.create({
    model: UTILITY_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an evidence categorization assistant. Given an investment thesis and a piece of evidence, determine:
1. "summary": A one-line summary of the evidence (max 300 chars)
2. "stance": One of "supports", "contradicts", or "neutral"
3. "source_label": A short label for the source (e.g., "Reuters", "Bloomberg", "Personal analysis"). Null if unclear.
4. "body": The most relevant quote or excerpt from the evidence (max 2000 chars). Null if the input is already short enough.

The thesis:
- Belief: ${assumption.belief}
- Logic: ${assumption.causal_logic}
- Invalidation conditions: ${assumption.invalidation_conditions.join("; ")}

Return valid JSON only.`,
      },
      { role: "user", content: text.slice(0, 10000) },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  const parsed = JSON.parse(content);
  const validStances = ["supports", "contradicts", "neutral"] as const;
  const stance = validStances.includes(parsed.stance) ? parsed.stance : "neutral";
  return {
    summary: String(parsed.summary || "").slice(0, 300),
    stance,
    source_label: parsed.source_label ? String(parsed.source_label) : null,
    body: parsed.body ? String(parsed.body).slice(0, 2000) : null,
  };
}

export async function extractFromUrl(
  pageContent: string,
  pageTitle: string,
  assumption: Pick<Assumption, "belief" | "causal_logic" | "invalidation_conditions">
): Promise<EvidenceSuggestion> {
  const response = await getClient().chat.completions.create({
    model: UTILITY_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an evidence extraction assistant. Given the content of a web page and an investment thesis, extract the most relevant information as evidence.

1. "summary": A one-line summary of how this article relates to the thesis (max 300 chars)
2. "stance": One of "supports", "contradicts", or "neutral"
3. "source_label": The publication or source name (e.g., "Reuters", "WSJ"). Use the page title if unclear.
4. "body": The most relevant quote or data point from the article (max 2000 chars)

The thesis:
- Belief: ${assumption.belief}
- Logic: ${assumption.causal_logic}
- Invalidation conditions: ${assumption.invalidation_conditions.join("; ")}

Return valid JSON only.`,
      },
      {
        role: "user",
        content: `Page title: ${pageTitle}\n\nContent:\n${pageContent.slice(0, 10000)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  const parsed = JSON.parse(content);
  const validStances = ["supports", "contradicts", "neutral"] as const;
  const stance = validStances.includes(parsed.stance) ? parsed.stance : "neutral";
  return {
    summary: String(parsed.summary || "").slice(0, 300),
    stance,
    source_label: parsed.source_label ? String(parsed.source_label) : (pageTitle || null),
    body: parsed.body ? String(parsed.body).slice(0, 2000) : null,
  };
}

export async function generateSummary(
  assumption: Pick<
    Assumption,
    "belief" | "causal_logic" | "invalidation_conditions"
  >,
  evidence: Pick<EvidenceEntry, "summary" | "stance" | "created_at">[]
): Promise<string> {
  if (evidence.length === 0) {
    return "No evidence logged yet. Add evidence to get an AI-generated summary.";
  }

  const stanceCounts = evidence.reduce(
    (acc, e) => {
      acc[e.stance]++;
      return acc;
    },
    { supports: 0, contradicts: 0, neutral: 0 }
  );

  const evidenceList = evidence
    .map((e) => `[${e.stance}] ${e.summary}`)
    .join("\n");

  const response = await getClient().chat.completions.create({
    model: UTILITY_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `You are a thesis evaluation assistant. Given an investment thesis and all logged evidence, produce a brief synthesis. Format:

"N supporting, N contradicting, N neutral. [One sentence: for each invalidation condition, state whether logged evidence suggests it has been met, is approaching, or remains unmet.]"

Keep it to one paragraph max. Be direct and specific.`,
      },
      {
        role: "user",
        content: `Thesis: ${assumption.belief}
Logic: ${assumption.causal_logic}
Invalidation conditions: ${assumption.invalidation_conditions.join("; ")}

Evidence (${stanceCounts.supports} supporting, ${stanceCounts.contradicts} contradicting, ${stanceCounts.neutral} neutral):
${evidenceList}`,
      },
    ],
  });

  return (
    response.choices[0]?.message?.content ||
    `${stanceCounts.supports} supporting, ${stanceCounts.contradicts} contradicting, ${stanceCounts.neutral} neutral.`
  );
}
