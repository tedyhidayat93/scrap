import { NextResponse } from "next/server";
import { z } from "zod";
import { askOllama } from "@/lib/ollama-client";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";

/* -------------------------------------------------------
 * ZOD SCHEMA
 * ----------------------------------------------------- */
const ProContraCommentSchema = z.object({
  index: z.number().describe("Index of the comment (1-based)"),
  score: z.number().min(1).max(10).describe("Strength of pro/contra stance (1-10)"),
  reason: z.string().describe("Why this comment is pro or contra"),
})

const ProContraAnalysisSchema = z.object({
  comments: z.array(ProContraCommentSchema),
  summary: z.object({
    total: z.number(),
    percentage: z.number(),
    themes: z.array(z.string()),
  }),
});

/* -------------------------------------------------------
 * RETRY WITH BACKOFF
 * ----------------------------------------------------- */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      const retryable =
        err?.message?.includes("timeout") ||
        err?.message?.includes("network") ||
        err?.message?.includes("connection");

      if (!retryable || attempt === maxRetries - 1) throw err;

      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`[AI] Retry attempt ${attempt + 1}: waiting ${delay}ms`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  throw lastError;
}

/* -------------------------------------------------------
 * CLEAN JSON EXTRACTOR
 * ----------------------------------------------------- */
function extractJson(response: string) {
  try {
    const match =
      response.match(/```json\n([\s\S]*?)\n```/) ||
      response.match(/```([\s\S]*?)```/) ||
      response.match(/{[\s\S]*}/);

    if (!match) throw new Error("No JSON found in AI response");

    const cleaned = match[0].replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Invalid JSON response from AI");
  }
}

/* -------------------------------------------------------
 * MAIN API HANDLER
 * ----------------------------------------------------- */
export async function POST(request: Request) {
  try {
    const { comments, type } = await request.json();

    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json({ error: "Comments array is required" }, { status: 400 });
    }

    if (!["pro", "contra"].includes(type)) {
      return NextResponse.json({ error: "Type must be 'pro' or 'contra'" }, { status: 400 });
    }

    const sample = comments.slice(0, 100);
    const commentTexts = sample.map((c: any, i: number) => `${i + 1}. ${c.text}`).join("\n");

    const prompt = `
Analyze these comments and determine which are ${type.toUpperCase()}.

Comments:
${commentTexts}

Return valid JSON only matching this schema:
${JSON.stringify(ProContraAnalysisSchema.shape, null, 2)}
`;

    /* -------------------------------------------------------
     * TRY OLLAMA FIRST
     * ----------------------------------------------------- */
    try {
      const aiResponse = await retryWithBackoff(async () => {
        const raw = await askOllama(process.env.OLLAMA_MODEL_LLM!, prompt);
        return extractJson(raw);
      });

      const valid = ProContraAnalysisSchema.safeParse(aiResponse);
      if (!valid.success) throw new Error("Invalid schema from Ollama");

      return formatResult(valid.data, sample, type);
    } catch (err: any) {
      console.error("[AI] Ollama failed → switching to OpenAI");
    }

    /* -------------------------------------------------------
     * FALLBACK → OPENAI
     * ----------------------------------------------------- */
    try {
      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: ProContraAnalysisSchema,
        prompt,
        temperature: 0.2,
      });

      return formatResult(object, sample, type);
    } catch (openaiErr: any) {
      console.error("[AI] OpenAI failed:", openaiErr);

      if (openaiErr?.status === 429) {
        return NextResponse.json(
          { error: "OpenAI quota exceeded." },
          { status: 429 }
        );
      }

      throw openaiErr;
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to analyze comments" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------
 * RESULT TRANSFORMER
 * ----------------------------------------------------- */
function formatResult(parsed: any, sample: any[], type: string) {
  const enriched = parsed.comments
    .map((c: any) => {
      const original = sample[c.index - 1];
      if (!original) return null;

      return {
        ...original,
        score: c.score,
        reason: c.reason,
      };
    })
    .filter(Boolean);

  const commentsKey = `${type}Comments`;
  const summaryKey = type === "pro" ? "commonThemes" : "commonObjections";

  return NextResponse.json({
    [commentsKey]: enriched,
    summary: {
      total: parsed.summary.total,
      percentage: parsed.summary.percentage,
      [summaryKey]: parsed.summary.themes,
    },
  });
}
