import { z } from "zod";
import { askOllama } from "@/lib/ollama-client";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";

/* -----------------------------------------
 *  SCHEMA
 * ----------------------------------------- */
const narrativeSchema = z.object({
  mainNarrative: z.object({
    title: z.string().describe("The primary topic or theme being discussed"),
    description: z
      .string()
      .describe("A brief explanation of what people are saying about this topic"),
    sentiment: z
      .enum(["positive", "negative", "neutral"])
      .describe("Overall sentiment of the main narrative"),
    keywords: z
      .array(z.string())
      .describe("Key terms and phrases related to this narrative"),
    percentage: z
      .number()
      .describe("Estimated percentage of comments discussing this topic"),
  }),
  secondaryNarratives: z
    .array(
      z.object({
        topic: z.string().describe("The discussion theme"),
        sentiment: z.enum(["positive", "negative", "neutral"]),
        keywords: z.array(z.string()),
        commentCount: z.number().describe("Estimated number of comments"),
        percentage: z.number().describe("Percentage of total comments"),
      })
    )
    .max(4)
    .describe("Other significant discussion themes"),
});

/* -----------------------------------------
 *  HELPERS
 * ----------------------------------------- */
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let error: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      error = e;

      const retryable =
        e?.message?.includes("network") ||
        e?.message?.includes("timeout") ||
        e?.message?.includes("connection");

      if (!retryable || i === maxRetries - 1) throw error;

      const ms = initialDelay * 2 ** i;
      console.log(`[v0] Retry ${i + 1}/${maxRetries} after ${ms}ms: ${e.message}`);
      await delay(ms);
    }
  }

  throw error;
}

function extractJSON(text: string) {
  const match =
    text.match(/```json\n([\s\S]*?)```/) ||
    text.match(/{[\s\S]*}/);

  if (!match) throw new Error("No JSON found");

  const clean = match[0].replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

function buildPrompt(total: number, sample: string) {
  return `Analyze these ${total} TikTok comments and identify the main narrative and secondary narratives.

Comments:
${sample}

Your task:
1. Identify the PRIMARY narrative  
2. Identify secondary narratives  
3. Determine sentiment & keywords  
4. Estimate narrative percentages

Return ONLY valid JSON matching this schema:
${JSON.stringify(narrativeSchema.shape, null, 2)}

Ensure:
- JSON only, no extra text
- All required properties included
- Percentages sum approx 100%`;
}

/* -----------------------------------------
 *  MODEL CALLS
 * ----------------------------------------- */
async function analyzeWithOllama(prompt: string) {
  const raw = await retryWithBackoff(async () => {
    return await askOllama(process.env.OLLAMA_MODEL_LLM!, prompt);
  });

  return extractJSON(raw);
}

async function analyzeWithOpenAI(prompt: string) {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: narrativeSchema,
    prompt,
    temperature: 0.3,
  });

  return object;
}

/* -----------------------------------------
 *  MAIN HANDLER
 * ----------------------------------------- */
export async function POST(req: Request) {
  try {
    const { comments } = await req.json();

    if (!comments?.length) {
      return Response.json({ error: "No comments provided" }, { status: 400 });
    }

    const sample = comments
      .slice(0, 100)
      .map((c: any) => c.text)
      .filter(Boolean)
      .join("\n---\n");

    const prompt = buildPrompt(comments.length, sample);

    /* ------------------------------
     *  TRY OLLAMA FIRST
     * ------------------------------ */
    try {
      const json = await analyzeWithOllama(prompt);

      const parsed = narrativeSchema.safeParse(json);
      if (!parsed.success) throw new Error("Invalid Ollama JSON");

      return Response.json(parsed.data);
    } catch (e) {
      console.error("[v0] Ollama failed → fallback to OpenAI", e);
    }

    /* ------------------------------
     *  FALLBACK → OPENAI
     * ------------------------------ */
    try {
      const result = await analyzeWithOpenAI(prompt);
      return Response.json(result);
    } catch (error: any) {
      console.error("[v0] OpenAI fallback error:", error);

      if (
        error?.status === 429 ||
        error?.message?.includes("quota") ||
        error?.message?.includes("insufficient_quota")
      ) {
        return Response.json(
          {
            error:
              "OpenAI quota exceeded. Check your billing at https://platform.openai.com/account/billing",
          },
          { status: 429 }
        );
      }

      return Response.json(
        { error: "Failed to analyze narratives", details: error.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[v0] Root error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze narratives",
      },
      { status: 500 }
    );
  }
}
