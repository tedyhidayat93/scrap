import { NextResponse } from "next/server"
import { z } from "zod"
import { askOllama } from "@/lib/ollama-client"

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
        error?.message?.includes("network") || 
        error?.message?.includes("timeout") ||
        error?.message?.includes("connection")

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

function extractJsonFromResponse(response: string): any {
  try {
    // Try to extract JSON from code blocks first
    const jsonMatch = response.match(/```(?:json)?\n([\s\S]*?)\n```/) || 
                     response.match(/{[\s\S]*}/)
    
    if (!jsonMatch) {
      throw new Error("No JSON found in response")
    }

    const jsonString = jsonMatch[0].replace(/```(?:json)?/g, '').trim()
    return JSON.parse(jsonString)
  } catch (e) {
    console.error("Failed to parse JSON from response:", e)
    throw new Error("Invalid JSON response from AI")
  }
}

export async function POST(request: Request) {
  try {
    const { comments, sentimentCounts } = await request.json()

    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json({ error: "Comments array is required" }, { status: 400 })
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

    Provide a comprehensive intelligence assessment following this JSON schema exactly:

    {
      "threatLevel": {
        "level": "low|medium|high|critical",
        "description": "string",
        "indicators": ["string"]
      },
      "keyEntities": {
        "people": ["string"],
        "organizations": ["string"],
        "locations": ["string"]
      },
      "behavioralPatterns": [{
        "pattern": "string",
        "frequency": 0-100,
        "significance": "string"
      }],
      "emergingTrends": [{
        "trend": "string",
        "momentum": "rising|stable|declining",
        "description": "string",
        "keywords": ["string"]
      }],
      "recommendations": [{
        "action": "string",
        "priority": "low|medium|high",
        "rationale": "string"
      }]
    }

    Focus on:
    - Information integrity (fake news, manipulation)
    - Community safety (harassment, threats)
    - Narrative warfare (coordinated messaging)
    - Anomalous activity (bot networks, spam)
    - Sentiment shifts and polarization

    Return ONLY valid JSON, no other text.`

    try {
      console.log(`[v0] Analyzing intelligence from ${sampleComments.length} comments...`)
      console.log(`prompt...:`, prompt)

      const response = await retryWithBackoff(async () => {
        const result = await askOllama(process.env.OLLAMA_MODEL_LLM!, prompt)
        try {
          return extractJsonFromResponse(result)
        } catch (e) {
          console.error("Failed to parse AI response:", e)
          throw new Error("Invalid response format from AI")
        }
      })

      const result = IntelligenceSchema.safeParse(response)
      
      if (!result.success) {
        console.error("[v0] Invalid response format from Ollama:", result.error)
        throw new Error("Invalid response format from AI")
      }

      console.log(`[v0] Intelligence analysis complete`)
      return NextResponse.json(result.data)
    } catch (error: any) {
      console.error(`[v0] Error in intelligence analysis:`, error.message)
      return NextResponse.json(
        { error: error.message || "Failed to analyze intelligence" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error(`[v0] Error in intelligence analysis:`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    )
  }
}