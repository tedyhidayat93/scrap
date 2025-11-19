import { generateObject } from "ai"
import { z } from "zod"

const counterNarrativeSchema = z.object({
  counterComments: z
    .array(
      z.object({
        text: z.string().describe("The comment text"),
        reason: z.string().describe("Why this comment counters the main narrative"),
        counterScore: z.number().min(1).max(10).describe("How strongly it contradicts (1-10)"),
        keywords: z.array(z.string()).describe("Key disagreement words or phrases"),
      }),
    )
    .max(20)
    .describe("Comments that contradict or challenge the main narrative"),
  summary: z.object({
    totalCounter: z.number().describe("Total number of counter-narrative comments found"),
    percentage: z.number().describe("Percentage of comments that counter the narrative"),
    mainObjections: z.array(z.string()).describe("Common objections or criticisms"),
  }),
})

export async function POST(req: Request) {
  try {
    const { comments, mainNarrative } = await req.json()

    if (!comments || comments.length === 0) {
      return Response.json({ error: "No comments provided" }, { status: 400 })
    }

    // Sample comments for AI analysis
    const sampleComments = comments
      .slice(0, 100)
      .map((c: any, idx: number) => `[${idx}] ${c.text}`)
      .filter(Boolean)
      .join("\n")

    const { object } = await generateObject({
      model: "openai/gpt-4o-mini",
      schema: counterNarrativeSchema,
      prompt: `Analyze these TikTok comments and identify which ones CONTRADICT or CHALLENGE the main narrative.

Main Narrative: ${mainNarrative || "The dominant opinion in the comments"}

Comments (total: ${comments.length}):
${sampleComments}

Find comments that:
- Disagree with the main narrative
- Express skepticism or doubt
- Present opposing viewpoints
- Challenge the dominant opinion
- Criticize or question the content

For each counter-narrative comment, explain WHY it contradicts the main narrative and rate how strongly (1-10).`,
      temperature: 0.3,
    })

    // Map AI results back to original comments
    const enrichedCounterComments = object.counterComments
      .map((aiComment) => {
        // Find the original comment by matching text
        const originalComment = comments.find((c: any) => c.text && aiComment.text.includes(c.text.substring(0, 50)))

        return {
          ...originalComment,
          ...aiComment,
          counterScore: aiComment.counterScore,
          counterReason: aiComment.reason,
          counterKeywords: aiComment.keywords,
        }
      })
      .filter(Boolean)

    return Response.json({
      ...object,
      counterComments: enrichedCounterComments,
    })
  } catch (error) {
    console.error("[v0] Error analyzing counter-narratives:", error)
    return Response.json({ error: "Failed to analyze counter-narratives" }, { status: 500 })
  }
}
