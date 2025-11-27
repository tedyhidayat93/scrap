import { NextResponse } from "next/server";
import { z } from "zod";
import { askOllama } from "@/lib/ollama-client";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";

/* -------------------------------------------------------
 * ZOD SCHEMA
 * ----------------------------------------------------- */
const counterNarrativeSchema = z.object({
  counterComments: z
    .array(
      z.object({
        text: z.string(),
        reason: z.string().optional().default(""),
        word: z
          .string()
          .describe("The counter-narrative sentence addressing the comment")
          .optional()
          .default(""),
        counterScore: z.number().min(1).max(10).optional().default(5),
        keywords: z.array(z.string()).optional().default([]),
      })
    )
    .max(20)
    .default([]),

  summary: z.object({
    totalCounter: z.number().default(0),
    percentage: z.number().default(0),
    mainObjections: z.array(z.string()).default([]),
  }),
});

/* -------------------------------------------------------
 * UTIL: Retry with exponential backoff for Ollama
 * ----------------------------------------------------- */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 800
): Promise<T> {
  let lastErr: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;

      const retryable =
        err?.message?.includes("network") ||
        err?.message?.includes("timeout") ||
        err?.message?.includes("connection");

      if (!retryable || i === maxRetries - 1) throw err;

      const delay = initialDelay * Math.pow(2, i);
      console.warn(`[Ollama] Retry attempt ${i + 1}, waiting ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastErr;
}

/* -------------------------------------------------------
 * UTIL: Extract JSON from raw model text
 * ----------------------------------------------------- */
function extractJsonFromResponse(raw: string) {
  try {
    const match =
      raw.match(/```json\n([\s\S]*?)```/) ||
      raw.match(/```([\s\S]*?)```/) ||
      raw.match(/{[\s\S]*}/);

    if (!match) throw new Error("No JSON found in response");

    const cleaned = match[0].replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("❌ JSON Extract Error:", e);
    throw new Error("Invalid JSON response from AI");
  }
}

/* -------------------------------------------------------
 * MAIN POST HANDLER
 * ----------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const { comments, mainNarrative } = await req.json();

    if (!comments?.length) {
      return NextResponse.json({ error: "No comments provided" }, { status: 400 });
    }

    const sampleComments = comments
      .filter((c: any) => c.sentiment === "negative")
      .slice(0, 100)
      .map((c: any, idx: number) => `[${idx}] ${c.text}`)
      .join("\n");

    const prompt = `
Analyze these TikTok comments and identify which ones contradict or challenge the main narrative.

Main Narrative:
${mainNarrative || "The dominant opinion in the comments"}

Comments:
${sampleComments}

Return JSON ONLY with the following schema:
${JSON.stringify(counterNarrativeSchema.shape, null, 2)}

(Your output must be STRICT VALID JSON, no markdown, no backticks)
`;

    /* -------------------------------------------------------
     * STEP 1: TRY OLLAMA WITH RETRY
     * ----------------------------------------------------- */
    try {
      const aiResponse = await retryWithBackoff(async () => {
        const raw = await askOllama(process.env.OLLAMA_MODEL_LLM!, prompt);
        return extractJsonFromResponse(raw);
      });

      const parsed = counterNarrativeSchema.safeParse(aiResponse);
      if (!parsed.success) throw new Error("Ollama returned invalid schema");

      // Match comments back to original
      const enriched = parsed.data.counterComments.map((ai) => {
        const original = comments.find((c: any) => c.text === ai.text);
        return {
          ...(original || {}),
          text: ai.text,
          counterScore: ai.counterScore,
          counterReason: ai.reason,
          counterWord: ai.word,
          counterKeywords: ai.keywords,
        };
      });

      return NextResponse.json({
        summary: parsed.data.summary,
        counterComments: enriched,
      });
    } catch (ollamaError) {
      console.error("⚠️ Ollama failed → switching to OpenAI fallback");
    }

    /* -------------------------------------------------------
     * STEP 2: FALLBACK → OPENAI GPT-4o-mini
     * ----------------------------------------------------- */
    try {
      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: counterNarrativeSchema,
        prompt,
        temperature: 0.2,
      });

      const enriched = object.counterComments.map((ai: any) => {
        const original = comments.find((c: any) => c.text === ai.text);
        return {
          ...(original || {}),
          text: ai.text,
          counterScore: ai.counterScore,
          counterReason: ai.reason,
          counterWord: ai.word,
          counterKeywords: ai.keywords,
        };
      });

      return NextResponse.json({
        summary: object.summary,
        counterComments: enriched,
      });
    } catch (openaiError: any) {
      console.error("❌ OpenAI fallback failed:", openaiError);

      if (openaiError?.status === 429) {
        return NextResponse.json(
          {
            error:
              "OpenAI quota exceeded. Please check billing at platform.openai.com",
          },
          { status: 429 }
        );
      }

      throw openaiError;
    }
  } catch (finalErr: any) {
    console.error("❌ Final AI Error:", finalErr);

    return NextResponse.json(
      { error: finalErr?.message ?? "Failed to analyze comments" },
      { status: 500 }
    );
  }
}
