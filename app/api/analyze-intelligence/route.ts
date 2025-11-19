import { NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"
import { openai } from "@ai-sdk/openai"

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

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      const isRetryable =
        error?.status === 502 ||
        error?.status === 503 ||
        error?.status === 504 ||
        error?.message?.includes("502") ||
        error?.message?.includes("Bad Gateway")

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error
      }

      const delay = initialDelay * Math.pow(2, attempt)
      console.log(`[v0] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

export async function POST(request: Request) {
  try {
    const { comments, sentimentCounts } = await request.json()

    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json({ error: "Comments array is required" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const sampleComments = comments.slice(0, 100)
    const commentTexts = sampleComments.map((c, i) => `${i + 1}. ${c.text}`).join("\n")

    const totalComments = comments.length
    const positivePercent = ((sentimentCounts.positive / totalComments) * 100).toFixed(1)
    const negativePercent = ((sentimentCounts.negative / totalComments) * 100).toFixed(1)
    const neutralPercent = ((sentimentCounts.neutral / totalComments) * 100).toFixed(1)

    const prompt = `You are a cybersecurity intelligence analyst. Analyze these ${totalComments} social media comments and extract actionable intelligence.

SENTIMENT DISTRIBUTION:
- Positive: ${positivePercent}%
- Negative: ${negativePercent}%
- Neutral: ${neutralPercent}%

COMMENTS:
${commentTexts}

Provide a comprehensive intelligence assessment including:

1. THREAT LEVEL: Assess potential risks (disinformation, harassment, manipulation, polarization)
2. KEY ENTITIES: Extract notable people, organizations, and locations mentioned
3. BEHAVIORAL PATTERNS: Identify coordinated behavior, bot activity, or unusual patterns
4. EMERGING TRENDS: Detect rising topics or shifting narratives
5. RECOMMENDATIONS: Suggest monitoring actions or intervention strategies

Focus on:
- Information integrity (fake news, manipulation)
- Community safety (harassment, threats)
- Narrative warfare (coordinated messaging)
- Anomalous activity (bot networks, spam)
- Sentiment shifts and polarization`

    try {
      console.log(`[v0] Analyzing intelligence from ${sampleComments.length} comments...`)

      const { object } = await retryWithBackoff(async () => {
        return await generateObject({
          model: openai("gpt-4o-mini"),
          schema: IntelligenceSchema,
          prompt,
          temperature: 0.3,
        })
      })

      console.log(`[v0] Intelligence analysis complete`)

      return NextResponse.json(object)
    } catch (aiError: any) {
      console.error("[v0] AI Error:", aiError?.message)

      if (aiError?.status === 502 || aiError?.message?.includes("502")) {
        return NextResponse.json({ error: "OpenAI server temporarily unavailable. Please try again." }, { status: 502 })
      }

      if (aiError?.status === 429 || aiError?.message?.includes("quota")) {
        return NextResponse.json({ error: "OpenAI quota exceeded. Please check your billing." }, { status: 429 })
      }

      if (aiError?.status === 401) {
        return NextResponse.json({ error: "OpenAI authentication failed. Verify API key." }, { status: 401 })
      }

      throw aiError
    }
  } catch (error) {
    console.error(`[v0] Error analyzing intelligence:`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze intelligence" },
      { status: 500 },
    )
  }
}
