import { NextResponse } from "next/server";
import { z } from "zod";
import { askOllama } from "@/lib/ollama-client";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";

/* -------------------------------------------------------
 * ZOD SCHEMA
 * ----------------------------------------------------- */
const IntelligenceSchema = z.object({
  threatLevel: z.object({
    level: z.enum(["low", "medium", "high", "critical"]).describe("Overall threat level"),
    description: z.string().describe("Explanation of the threat level"),
    indicators: z.array(z.string()).describe("Key indicators that influenced the threat level"),
  }),
  keyEntities: z.object({
    people: z.array(z.string()).describe("Notable people or influencers mentioned"),
    organizations: z.array(z.string()).describe("Organizations, brands, or groups mentioned"),
    locations: z.array(z.string()).describe("Geographic locations mentioned"),
  }),
  behavioralPatterns: z.array(
    z.object({
      pattern: z.string().describe("Description of the behavioral pattern"),
      frequency: z.number().describe("How common this pattern is (percentage)"),
      significance: z.string().describe("Why this pattern matters"),
    }),
  ),
  emergingTrends: z.array(
    z.object({
      trend: z.string().describe("The emerging trend or topic"),
      momentum: z.enum(["rising", "stable", "declining"]).describe("Direction of the trend"),
      description: z.string().describe("What this trend means"),
      keywords: z.array(z.string()).describe("Related keywords"),
    }),
  ),
  recommendations: z.array(
    z.object({
      action: z.string().describe("Recommended action to take"),
      priority: z.enum(["low", "medium", "high"]).describe("Priority level"),
      rationale: z.string().describe("Why this action is recommended"),
    }),
  ),
})

/* -------------------------------------------------------
 * UTIL: Retry with exponential backoff
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
        err?.message?.includes("network") ||
        err?.message?.includes("timeout") ||
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
 * UTIL: Extract JSON cleanly
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
  } catch (err) {
    throw new Error("Invalid JSON response from AI");
  }
}

/* -------------------------------------------------------
 * MAIN POST HANDLER
 * ----------------------------------------------------- */
export async function POST(request: Request) {
  try {
    const { comments, sentimentCounts } = await request.json();

    if (!comments || comments.length === 0) {
      return NextResponse.json(
        { error: "Comments array is required" },
        { status: 400 }
      );
    }

    /* Build prompt */
    const total = comments.length;
    const sample = comments.slice(0, 100);
    const commentTexts = sample
      .map((c: any, i: number) => `${i + 1}. ${c.text}`)
      .join("\n");

    const pct = {
      pos: ((sentimentCounts.positive / total) * 100).toFixed(1),
      neg: ((sentimentCounts.negative / total) * 100).toFixed(1),
      neu: ((sentimentCounts.neutral / total) * 100).toFixed(1),
    };

    const prompt = `
You are a cybersecurity intelligence analyst.

SENTIMENT:
- Positive: ${pct.pos}%
- Negative: ${pct.neg}%
- Neutral: ${pct.neu}%

COMMENTS:
${commentTexts}

Return JSON strictly following this schema:
${JSON.stringify(IntelligenceSchema.shape, null, 2)}
`;

    /* -------------------------------------------------------
     * STEP 1: Try OLLAMA
     * ----------------------------------------------------- */
    try {
      const aiResponse = await retryWithBackoff(async () => {
        const raw = await askOllama(process.env.OLLAMA_MODEL_INTELLIGENCE_ANALYSIS!, prompt);
        return extractJson(raw);
      });

      const valid = IntelligenceSchema.safeParse(aiResponse);
      if (!valid.success) throw new Error("Invalid schema from Ollama");

      return NextResponse.json(valid.data);
    } catch (ollamaErr: any) {
      console.error("[AI] Ollama failed, falling back → OpenAI");
    }

    /* -------------------------------------------------------
     * STEP 2: FALLBACK OPENAI
     * ----------------------------------------------------- */
    try {
      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: IntelligenceSchema,
        prompt,
        temperature: 0.2,
      });

      return NextResponse.json(object);
    } catch (openaiErr: any) {
      console.error("[AI] OpenAI failed:", openaiErr);

      if (
        openaiErr?.status === 429 ||
        openaiErr?.message?.includes("quota")
      ) {
        return NextResponse.json(
          {
            error:
              "OpenAI quota exceeded. Check billing at https://platform.openai.com/account/billing",
          },
          { status: 429 }
        );
      }

      throw openaiErr;
    }
  } catch (error: any) {
    console.error("[AI] Final failure:", error);
    return NextResponse.json(
      {
        error: error.message ?? "Failed to analyze intelligence",
      },
      { status: 500 }
    );
  }
}
