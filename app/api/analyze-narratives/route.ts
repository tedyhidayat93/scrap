import { z } from "zod";
import { askOllama } from "@/lib/ollama-client";

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

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      const isRetryable = 
        error?.message?.includes("network") || 
        error?.message?.includes("timeout") ||
        error?.message?.includes("connection");

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`[v0] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms due to: ${error?.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

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

    const prompt = `Analyze these ${comments.length} TikTok comments and identify the main narrative and secondary narratives being discussed. 

    Comments:
    ${sampleComments}

    Your task:
    1. Identify the PRIMARY narrative - what most people are talking about
    2. Find secondary narratives - other significant discussion themes
    3. Determine the sentiment and key topics for each narrative
    4. Estimate the percentage of comments for each narrative based on the sample

    Format your response as valid JSON matching this schema:
    ${JSON.stringify(narrativeSchema.shape, null, 2)}

    Make sure to:
    - Keep the response as valid JSON
    - Include all required fields
    - Don't include any additional text outside the JSON
    - Ensure percentages add up to approximately 100%`;

    try {
      const response = await retryWithBackoff(async () => {
        const result = await askOllama(process.env.OLLAMA_MODEL_LLM!, prompt);
        try {
          // Try to extract JSON from the response
          const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/) || result.match(/{[\s\S]*}/);
          const jsonString = jsonMatch ? jsonMatch[0].replace(/```(json)?/g, '').trim() : result;
          return JSON.parse(jsonString);
        } catch (e) {
          console.error("Failed to parse Ollama response:", e);
          throw new Error("Invalid JSON response from Ollama");
        }
      });

      const result = narrativeSchema.safeParse(response);
      
      if (!result.success) {
        console.error("[v0] Invalid response format from Ollama:", result.error);
        throw new Error("Invalid response format from AI");
      }

      return Response.json(result.data);
    } catch (error: any) {
      console.error("[v0] Error analyzing narratives with Ollama:", error);
      
      if (error.message.includes("Invalid JSON")) {
        return Response.json(
          { error: "The AI returned an invalid response format. Please try again." },
          { status: 500 }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("[v0] Error in narrative analysis:", error);
    return Response.json(
      { 
        error: error instanceof Error ? error.message : "Failed to analyze narratives",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
