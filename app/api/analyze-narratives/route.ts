import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const narrativeSchema = z.object({
  mainNarrative: z.object({
    title: z.string().describe("The primary topic or theme being discussed"),
    description: z
      .string()
      .describe(
        "A brief explanation of what people are saying about this topic"
      ),
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

export async function POST(req: Request) {
  try {
    const { comments } = await req.json();

    if (!comments || comments.length === 0) {
      return Response.json({ error: "No comments provided" }, { status: 400 });
    }

    // Sample comments for AI analysis (max 100 to avoid token limits)
    const sampleComments = comments
      .slice(0, 100)
      .map((c: any) => c.text)
      .filter(Boolean)
      .join("\n---\n");

    try {
      const { object } = await generateObject({
        model: openai("gpt-4o-mini", {
          apiKey: process.env.OPENAI_API_KEY,
        }),
        schema: narrativeSchema,
        prompt: `Analyze these ${comments.length} TikTok comments and identify the main narrative and secondary narratives being discussed. 

        Comments:
        ${sampleComments}

        Identify:
        1. The PRIMARY narrative - what most people are talking about
        2. Secondary narratives - other significant discussion themes
        3. The sentiment and key topics for each narrative
        4. Estimate the percentage of comments for each narrative based on the sample`,
        temperature: 0.3,
      });

      return Response.json(object);
    } catch (aiError: any) {
      if (
        aiError?.status === 429 ||
        aiError?.message?.includes("quota") ||
        aiError?.message?.includes("insufficient_quota")
      ) {
        console.error("[v0] OpenAI quota exceeded");
        return Response.json(
          {
            error:
              "OpenAI quota exceeded. Please check your billing at https://platform.openai.com/account/billing",
          },
          { status: 429 }
        );
      }
      throw aiError;
    }
  } catch (error) {
    console.error("[v0] Error analyzing narratives:", error);
    return Response.json(
      { error: "Failed to analyze narratives" },
      { status: 500 }
    );
  }
}
