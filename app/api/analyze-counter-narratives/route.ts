import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const counterNarrativeSchema = z.object({
  counterComments: z
    .array(
      z.object({
        text: z.string(),
        reason: z.string().optional().default(""),
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

export async function POST(req: Request) {
  try {
    const { comments, mainNarrative } = await req.json();

    if (!comments || comments.length === 0) {
      return Response.json({ error: "No comments provided" }, { status: 400 });
    }

    // Ambil 100 komentar maksimum untuk AI
    const sampleComments = comments
      .slice(0, 100)
      .map((c: any, idx: number) => `[${idx}] ${c.text}`)
      .join("\n");

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: counterNarrativeSchema,
      // prompt: `
      // Analyze these TikTok comments and identify which ones contradict or challenge the main narrative.

      // Main Narrative: ${mainNarrative || "The dominant opinion in the comments"}

      // Comments:
      // ${sampleComments}

      // Return only:
      // - counterComments[] (max 20)
      // - summary
      // `,

      prompt: `
        Analyze these TikTok comments and identify which ones contradict or challenge the main narrative in an elegant and factual way.

        Main Narrative:
        ${mainNarrative || "The dominant opinion in the comments"}

        Comments:
        ${sampleComments}

        Your tasks:
        1. Identify comments that contradict, challenge, or question the main narrative.
        2. For each counter-matching comment, create a refined counter-narrative statement that is:
          - Elegant and non-aggressive.
          - Factual and logical.
          - Written in a formal tone but still easy to understand.
          - At least 10 words.
          - Written in the SAME LANGUAGE as the original comment (if the comment is in Indonesian, respond in Indonesian; if English, respond in English).
        3. Provide:
          - counterComments[] (max 20)
          - summary

        Return ONLY what the schema expects:
        - counterComments[] with:
          - text
          - reason
          - counterScore
          - keywords
        - summary with totalCounter, percentage, and mainObjections
        `,

      temperature: 0.3,
    });

    // Matching komentar yang lebih aman
    const enrichedCounter = object.counterComments.map((ai) => {
      const original = comments.find((c: any) => c.text === ai.text);

      return {
        ...(original || {}), // kalau ketemu ambil data original
        text: ai.text, // fallback
        counterScore: ai.counterScore,
        counterReason: ai.reason,
        counterKeywords: ai.keywords,
      };
    });

    return Response.json({
      summary: object.summary,
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
}
