import { NextResponse } from "next/server"
import { z } from "zod"
import { askOllama } from "@/lib/ollama-client"

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
    themes: z.array(z.string()).describe("Common themes or points (max 5)"),
  }),
})

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Check if it's a retryable error (network errors, etc.)
      const isRetryable = error?.message?.includes("network") || 
                         error?.message?.includes("timeout") ||
                         error?.message?.includes("connection")

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error
      }

      // Exponential backoff
      const delay = initialDelay * Math.pow(2, attempt)
      console.log(`[v0] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms due to: ${error?.message}`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

export async function POST(request: Request) {
  try {
    const { comments, type } = await request.json()

    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json({ error: "Comments array is required" }, { status: 400 })
    }

    const validTypes = ["pro", "contra"]
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Type must be 'pro' or 'contra'" }, { status: 400 })
    }

    console.log(`[v0] Analyzing ${type} comments with Ollama...`)
    console.log(`[v0] Comment count: ${comments.length}`)

    const sampleComments = comments.slice(0, 100)
    const commentTexts = sampleComments.map((c, i) => `${i + 1}. ${c.text}`).join("\n")

    const prompt = `Analyze these comments and identify which ones ${
      type === "pro" ? "SUPPORT or AGREE" : "OPPOSE or DISAGREE"
    } with the video's narrative/message.

      ${
        type === "pro"
          ? `Pro comments are those that:
      - Express agreement, support, or positive reinforcement
      - Praise the content or creator
      - Share similar experiences or viewpoints
      - Defend the video's message
      - Show enthusiasm or appreciation`
          : `Contra comments are those that:
      - Express disagreement or criticism
      - Challenge the video's claims or message
      - Point out flaws or inconsistencies
      - Offer opposing viewpoints
      - Show skepticism or doubt`
      }

      Comments:
      ${commentTexts}

      Return the ${
            type
          } comments with their index number (from the list above), strength score (1-10), and brief explanation.
      Also provide a summary with total count, percentage, and up to 5 common ${type === "pro" ? "themes" : "objections"}.

      Format your response as valid JSON matching this schema:
      ${JSON.stringify(ProContraAnalysisSchema.shape, null, 2)}`

    try {
      const response = await retryWithBackoff(async () => {
        const result = await askOllama(process.env.OLLAMA_MODEL_LLM!, prompt)
        try {
          // Try to extract JSON from the response
          const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/) || result.match(/{[\s\S]*}/)
          const jsonString = jsonMatch ? jsonMatch[0].replace(/```(json)?/g, '').trim() : result
          return JSON.parse(jsonString)
        } catch (e) {
          console.error("Failed to parse Ollama response:", e)
          throw new Error("Invalid JSON response from Ollama")
        }
      })

      const result = ProContraAnalysisSchema.safeParse(response)
      
      if (!result.success) {
        console.error("[v0] Invalid response format from Ollama:", result.error)
        throw new Error("Invalid response format from AI")
      }

      console.log(`[v0] Successfully analyzed ${result.data.comments.length} ${type} comments`)

      const enrichedComments = result.data.comments
        .map((comment) => {
          const originalComment = sampleComments[comment.index - 1]
          if (!originalComment) {
            console.warn(`[v0] Could not find comment at index ${comment.index}`)
            return null
          }
          return {
            ...originalComment,
            score: comment.score,
            reason: comment.reason,
          }
        })
        .filter(Boolean)

      const commentsKey = `${type}Comments`
      const totalKey = `total${type.charAt(0).toUpperCase()}${type.slice(1)}`
      const themesKey = type === "pro" ? "commonThemes" : "commonObjections"

      return NextResponse.json({
        [commentsKey]: enrichedComments,
        summary: {
          [totalKey]: result.data.summary.total,
          percentage: result.data.summary.percentage,
          [themesKey]: result.data.summary.themes,
        },
      })
    } catch (error: any) {
      console.error(`[v0] Error analyzing ${type} comments:`, error.message)
      console.error("[v0] Error details:", error)

      if (error.message.includes("Invalid JSON")) {
        return NextResponse.json(
          { error: "The AI returned an invalid response format. Please try again." },
          { status: 500 },
        )
      }

      return NextResponse.json(
        { error: error.message || "Failed to analyze comments" },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error(`[v0] Error in pro/contra analysis:`, error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 },
    )
  }
}
