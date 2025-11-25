import { NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"
import { openai } from "@ai-sdk/openai"

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

      // Check if it's a retryable error (502, 503, 504, network errors)
      const isRetryable =
        error?.status === 502 ||
        error?.status === 503 ||
        error?.status === 504 ||
        error?.message?.includes("502") ||
        error?.message?.includes("Bad Gateway") ||
        error?.message?.includes("network")

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error
      }

      // Exponential backoff: wait longer between each retry
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

    if (!process.env.OPENAI_API_KEY) {
      console.error("[v0] OpenAI API key not configured")
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables." },
        { status: 500 },
      )
    }

    console.log("[v0] OpenAI API key is configured:", process.env.OPENAI_API_KEY?.substring(0, 10) + "...")

    const sampleComments = comments.slice(0, 100)
    const commentTexts = sampleComments.map((c, i) => `${i + 1}. ${c.text}`).join("\n")

    const prompt =
      type === "pro"
        ? `Analyze these comments and identify which ones SUPPORT or AGREE with the video's narrative/message.

Pro comments are those that:
- Express agreement, support, or positive reinforcement
- Praise the content or creator
- Share similar experiences or viewpoints
- Defend the video's message
- Show enthusiasm or appreciation

Comments:
${commentTexts}

Return the pro comments with their index number (from the list above), strength score (1-10), and brief explanation.
Also provide a summary with total count, percentage, and up to 5 common themes.`
        : `Analyze these comments and identify which ones OPPOSE or DISAGREE with the video's narrative/message.

Contra comments are those that:
- Express disagreement or criticism
- Challenge the video's claims or message
- Point out flaws or inconsistencies
- Offer opposing viewpoints
- Show skepticism or doubt

Comments:
${commentTexts}

Return the contra comments with their index number (from the list above), strength score (1-10), and brief explanation.
Also provide a summary with total count, percentage, and up to 5 common objections.`

    try {
      console.log(`[v0] Analyzing ${type} comments with OpenAI...`)
      console.log(`[v0] Using model: gpt-4o-mini`)
      console.log(`[v0] Comment count: ${sampleComments.length}`)

      const { object } = await retryWithBackoff(async () => {
        return await generateObject({
          model: openai("gpt-4o-mini"),
          schema: ProContraAnalysisSchema,
          prompt,
        })
      })

      console.log(`[v0] Successfully analyzed ${object.comments.length} ${type} comments`)

      const enrichedComments = object.comments
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
          [totalKey]: object.summary.total,
          percentage: object.summary.percentage,
          [themesKey]: object.summary.themes,
        },
      })
    } catch (aiError: any) {
      console.error("[v0] AI Error occurred:")
      console.error("[v0] Error message:", aiError?.message)
      console.error("[v0] Error name:", aiError?.name)
      console.error("[v0] Error status:", aiError?.status)
      console.error("[v0] Error cause:", aiError?.cause)

      // Try to extract more details from the error
      if (aiError?.cause) {
        console.error("[v0] Cause details:", JSON.stringify(aiError.cause, null, 2))
      }

      // Log the full error object
      try {
        console.error("[v0] Full error object:", JSON.stringify(aiError, Object.getOwnPropertyNames(aiError), 2))
      } catch (e) {
        console.error("[v0] Could not stringify error object")
      }

      if (aiError?.status === 502 || aiError?.message?.includes("502") || aiError?.message?.includes("Bad Gateway")) {
        console.error("[v0] OpenAI server error (502 Bad Gateway)")
        return NextResponse.json(
          {
            error: "OpenAI server is temporarily unavailable (502 Bad Gateway). Please try again in a moment.",
          },
          { status: 502 },
        )
      }

      if (
        aiError?.status === 429 ||
        aiError?.message?.includes("quota") ||
        aiError?.message?.includes("insufficient_quota")
      ) {
        console.error("[v0] OpenAI quota exceeded")
        return NextResponse.json(
          {
            error: "OpenAI quota exceeded. Please check your billing at https://platform.openai.com/account/billing",
          },
          { status: 429 },
        )
      }

      if (aiError?.status === 401 || aiError?.message?.includes("401") || aiError?.message?.includes("Unauthorized")) {
        console.error("[v0] OpenAI authentication failed - check API key")
        return NextResponse.json(
          {
            error: "OpenAI authentication failed. Please verify your API key is correct.",
          },
          { status: 401 },
        )
      }

      throw new Error(`AI generation failed: ${aiError?.message || "Unknown error"}`)
    }
  } catch (error) {
    console.error(`[v0] Error analyzing comments:`, error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error(`[v0] Stack trace:`, error.stack)
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze comments" },
      { status: 500 },
    )
  }
}
