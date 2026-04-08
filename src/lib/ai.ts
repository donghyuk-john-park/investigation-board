import OpenAI from "openai";
import type {
  StructuredAssumption,
  EvidenceSuggestion,
  Assumption,
  EvidenceEntry,
  HealthScore,
  CounterView,
  MissingEvidence,
  StateShift,
  ReviewEvent,
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

// Shared helper: call OpenAI with structured JSON output and validate the result.
export async function callStructured<T>(
  model: string,
  temperature: number,
  systemPrompt: string,
  userContent: string,
  validate: (parsed: Record<string, unknown>) => T
): Promise<T> {
  const response = await getClient().chat.completions.create({
    model,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  const parsed = JSON.parse(content);
  return validate(parsed);
}

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
5. "related_condition_index": The 0-based index of the invalidation condition this evidence most closely relates to. Null if it doesn't clearly map to any single condition.

The thesis:
- Belief: ${assumption.belief}
- Logic: ${assumption.causal_logic}
- Invalidation conditions: ${assumption.invalidation_conditions.map((c, i) => `${i}: ${c}`).join("; ")}

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
  const conditionIndex = parsed.related_condition_index != null
    ? Math.round(Number(parsed.related_condition_index))
    : null;
  return {
    summary: String(parsed.summary || "").slice(0, 300),
    stance,
    source_label: parsed.source_label ? String(parsed.source_label) : null,
    body: parsed.body ? String(parsed.body).slice(0, 2000) : null,
    related_condition_index: Number.isFinite(conditionIndex) ? conditionIndex : null,
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

export async function assessThesisHealth(
  assumption: Pick<Assumption, "belief" | "causal_logic" | "invalidation_conditions">,
  evidence: Pick<EvidenceEntry, "summary" | "stance" | "created_at">[],
  reviews: Pick<ReviewEvent, "outcome" | "created_at">[]
): Promise<HealthScore> {
  const stanceCounts = evidence.reduce(
    (acc, e) => { acc[e.stance]++; return acc; },
    { supports: 0, contradicts: 0, neutral: 0 }
  );

  const evidenceList = evidence
    .map((e) => `[${e.stance}] ${e.summary} (${e.created_at})`)
    .join("\n");

  const reviewList = reviews.length > 0
    ? reviews.map((r) => `${r.outcome} on ${r.created_at}`).join("; ")
    : "No prior reviews";

  return callStructured<HealthScore>(
    STRUCTURING_MODEL,
    0.3,
    `You are a thesis health evaluator for investment assumptions. Given a thesis, its evidence log, and review history, assess:
1. "score": Integer 1-10. 8-10 = healthy (strong support, no conditions approaching). 4-7 = moderate risk (mixed signals or aging evidence). 1-3 = high risk (contradicting evidence dominant or conditions approaching/met).
2. "label": One of "healthy", "moderate_risk", "high_risk", "critical"
3. "reasoning": 2-3 sentences explaining the score. Be specific about what drives the rating.
4. "condition_status": For each invalidation condition, assess: "unmet" (no evidence suggests it), "approaching" (evidence suggests it may be close), or "met" (evidence indicates this condition is fulfilled). Include a brief note for each.

Return valid JSON only.`,
    `Thesis: ${assumption.belief}
Logic: ${assumption.causal_logic}
Invalidation conditions: ${assumption.invalidation_conditions.map((c, i) => `${i}: ${c}`).join("\n")}

Evidence (${stanceCounts.supports} supporting, ${stanceCounts.contradicts} contradicting, ${stanceCounts.neutral} neutral):
${evidenceList || "No evidence logged yet."}

Review history: ${reviewList}`,
    (parsed) => ({
      score: Math.min(10, Math.max(1, Math.round(Number(parsed.score) || 5))),
      label: (["healthy", "moderate_risk", "high_risk", "critical"] as const).includes(
        parsed.label as "healthy" | "moderate_risk" | "high_risk" | "critical"
      )
        ? (parsed.label as HealthScore["label"])
        : "moderate_risk",
      reasoning: String(parsed.reasoning || "").slice(0, 500),
      condition_status: Array.isArray(parsed.condition_status)
        ? (parsed.condition_status as Array<Record<string, unknown>>).map((cs, i) => ({
            index: Number(cs.index ?? i),
            status: (["unmet", "approaching", "met"] as const).includes(
              cs.status as "unmet" | "approaching" | "met"
            )
              ? (cs.status as "unmet" | "approaching" | "met")
              : "unmet",
            note: String(cs.note || ""),
          }))
        : assumption.invalidation_conditions.map((_, i) => ({
            index: i,
            status: "unmet" as const,
            note: "Unable to assess",
          })),
    })
  );
}

export async function generateCounterView(
  assumption: Pick<Assumption, "belief" | "causal_logic" | "invalidation_conditions">,
  evidence: Pick<EvidenceEntry, "summary" | "stance">[]
): Promise<CounterView> {
  const evidenceList = evidence
    .map((e) => `[${e.stance}] ${e.summary}`)
    .join("\n");

  return callStructured<CounterView>(
    STRUCTURING_MODEL,
    0.4,
    `You are a devil's advocate for investment theses. Given a thesis and its evidence log, construct the STRONGEST possible argument AGAINST the thesis. Ground your argument in the logged evidence where possible, and in known market dynamics where evidence is lacking.

Return JSON with:
1. "argument": The strongest counter-argument in 2-4 sentences. Be specific and concrete.
2. "grounding": What evidence or market knowledge supports this counter-view. 1-2 sentences.

Return valid JSON only.`,
    `Thesis: ${assumption.belief}
Logic: ${assumption.causal_logic}
Invalidation conditions: ${assumption.invalidation_conditions.join("; ")}

Evidence log:
${evidenceList || "No evidence logged yet."}`,
    (parsed) => ({
      argument: String(parsed.argument || "Unable to generate counter-view").slice(0, 1000),
      grounding: String(parsed.grounding || "").slice(0, 500),
    })
  );
}

export async function identifyMissingEvidence(
  assumption: Pick<Assumption, "belief" | "causal_logic" | "invalidation_conditions">,
  evidence: Pick<EvidenceEntry, "summary" | "stance">[]
): Promise<MissingEvidence> {
  const evidenceList = evidence
    .map((e) => `[${e.stance}] ${e.summary}`)
    .join("\n");

  return callStructured<MissingEvidence>(
    UTILITY_MODEL,
    0.3,
    `You are an evidence gap analyst for investment theses. Given a thesis and its current evidence log, identify 3-5 specific data points, events, or signals that the investor SHOULD be tracking but hasn't logged yet.

Focus on:
- Data that would confirm or deny invalidation conditions
- Upcoming events that could affect the thesis
- Metrics or indicators that are conspicuously absent from the evidence log

Return JSON with:
1. "gaps": Array of objects, each with "description" (what's missing, be specific) and "importance" (why it matters for this thesis, 1 sentence).

Return valid JSON only.`,
    `Thesis: ${assumption.belief}
Logic: ${assumption.causal_logic}
Invalidation conditions: ${assumption.invalidation_conditions.join("; ")}

Current evidence:
${evidenceList || "No evidence logged yet."}`,
    (parsed) => ({
      gaps: Array.isArray(parsed.gaps)
        ? (parsed.gaps as Array<Record<string, unknown>>)
            .filter((g) => g.description)
            .slice(0, 5)
            .map((g) => ({
              description: String(g.description).slice(0, 300),
              importance: String(g.importance || "").slice(0, 200),
            }))
        : [{ description: "Unable to identify gaps", importance: "" }],
    })
  );
}

export async function generateStateShift(
  assumption: Pick<Assumption, "belief" | "causal_logic" | "invalidation_conditions">,
  evidence: Pick<EvidenceEntry, "summary" | "stance" | "created_at">[],
  lastReviewDate: string | null
): Promise<StateShift> {
  const recentEvidence = lastReviewDate
    ? evidence.filter((e) => e.created_at > lastReviewDate)
    : evidence;

  const stanceCounts = evidence.reduce(
    (acc, e) => { acc[e.stance]++; return acc; },
    { supports: 0, contradicts: 0, neutral: 0 }
  );

  const recentList = recentEvidence
    .map((e) => `[${e.stance}] ${e.summary} (${e.created_at})`)
    .join("\n");

  return callStructured<StateShift>(
    UTILITY_MODEL,
    0.2,
    `You are a thesis change analyst. Given an investment thesis, its full evidence log, and recent changes since the last review, summarize what has shifted.

Return JSON with:
1. "changes": What's new since last review. 1-2 sentences. If no recent changes, say so.
2. "weakest_link": Which part of the thesis is most vulnerable right now. 1 sentence.
3. "counter_trend": How the ratio of supporting vs contradicting evidence has changed. Include numbers.
4. "watch_next": The single most important thing to watch for next. 1 sentence.

Return valid JSON only.`,
    `Thesis: ${assumption.belief}
Logic: ${assumption.causal_logic}
Invalidation conditions: ${assumption.invalidation_conditions.join("; ")}

Overall evidence: ${stanceCounts.supports} supporting, ${stanceCounts.contradicts} contradicting, ${stanceCounts.neutral} neutral

${lastReviewDate ? `Changes since last review (${lastReviewDate})` : "All evidence (no prior review)"}:
${recentList || "No evidence in this period."}`,
    (parsed) => ({
      changes: String(parsed.changes || "No changes to report.").slice(0, 500),
      weakest_link: String(parsed.weakest_link || "Unable to assess.").slice(0, 300),
      counter_trend: String(parsed.counter_trend || "").slice(0, 300),
      watch_next: String(parsed.watch_next || "").slice(0, 300),
    })
  );
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
