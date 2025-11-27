import { askOllama } from "@/lib/ollama-client";
import { z } from "zod";

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

function extractJsonFromResponse(response: string): any {
  try {
    const jsonMatch = response.match(/```(?:json)?\n([\s\S]*?)\n```/) || 
                     response.match(/{[\s\S]*}/);
    
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const jsonString = jsonMatch[0].replace(/```(?:json)?/g, '').trim();
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse JSON from response:", e);
    throw new Error("Invalid JSON response from AI");
  }
}

export async function POST(req: Request) {
  try {
    const { comments, mainNarrative } = await req.json();

    if (!comments || comments.length === 0) {
      return Response.json({ error: "No comments provided" }, { status: 400 });
    }

    // Take maximum 100 comments negative for AI
    const sampleComments = comments
  .filter((c: any) => c.sentiment === "negative") // Only get negative comments
  .slice(0, 100) // Take up to 100 negative comments
  .map((c: any, idx: number) => `[${idx}] ${c.text}`)
  .join("\n");

    const prompt = `
      Analyze these TikTok comments and identify which ones contradict or challenge the main narrative in an elegant and factual manner.

      Main Narrative:
      ${mainNarrative || "The dominant opinion in the comments"}

      Comments:
      ${sampleComments}

      Your tasks:
      1. Identify comments that contradict, challenge, or question the main narrative.
      2. For each identified comment, generate:
        - A refined counter-narrative sentence (field: "word") that is:
          - Elegant, non-aggressive, and factual  
          - Written in a formal tone and easy to understand  
          - At least 10 words  
          - Written in the SAME LANGUAGE as the original comment  
      3. Also include:
        - The reason why the comment is considered counter-narrative
        - A counterScore (1-10)
        - Related keywords
      4. Return ONLY valid JSON matching this schema:
      ${JSON.stringify(counterNarrativeSchema.shape, null, 2)}

      The response must be valid JSON only, no other text.`;

    try {
      const response = await askOllama(process.env.OLLAMA_MODEL_LLM!, prompt);
      const parsedResponse = extractJsonFromResponse(response);
      const result = counterNarrativeSchema.safeParse(parsedResponse);

      if (!result.success) {
        console.error("[v0] Invalid response format from Ollama:", result.error);
        throw new Error("Invalid response format from AI");
      }

      // Match comments safely
      const enrichedCounter = result.data.counterComments.map((ai) => {
        const original = comments.find((c: any) => c.text === ai.text);
        return {
          ...(original || {}), // take original data if found
          text: ai.text, // fallback
          counterScore: ai.counterScore,
          counterReason: ai.reason,
          counterWord: ai.word,
          counterKeywords: ai.keywords,
        };
      });

      return Response.json({
        summary: result.data.summary,
        counterComments: enrichedCounter,
      });
    } catch (error: any) {
      console.error("[v0] Error analyzing counter-narratives:", error);
      return Response.json(
        {
          error: error?.message || "Failed to analyze counter-narratives",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[v0] Error in counter-narratives analysis:", error);
    return Response.json(
      {
        error: error?.message || "Failed to process request",
      },
      { status: 500 }
    );
  }
}