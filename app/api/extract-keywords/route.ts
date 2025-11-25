import { askOllama } from "@/lib/ollama-client"
import { z } from "zod"
import { NextResponse } from "next/server"

const KeywordsSchema = z.object({
  keywords: z.array(
    z.object({
      word: z.string().describe("A meaningful keyword"),
      count: z.number().describe("Frequency of this keyword"),
      category: z.string().describe("Category: topic, person, place, brand, action, or other"),
    }),
  ),
})

export async function POST(request: Request) {
  try {
    const { comments } = await request.json()

    if (!comments || !Array.isArray(comments)) {
      return NextResponse.json({ success: false, error: "Invalid comments data" }, { status: 400 })
    }

    const sampleSize = Math.min(comments.length, 100)
    const sampledComments = comments.slice(0, sampleSize)
    const commentsText = sampledComments.map((c: any) => c.text || "").join("\n")

    console.log("[v0] Extracting keywords from", sampledComments.length, "comments using Ollama")

    try {
      const prompt = `Extract the top 10 most meaningful keywords from these comments.
      Rules:
      - Only extract nouns, verbs, and named entities (people, places, brands, topics)
      - Skip conjunctions (and, or, but), pronouns (I, you, he, she), articles (a, the), prepositions (in, on, at)
      - For Indonesian text, extract proper Indonesian words (not concatenated text)
      - Count how many times each keyword appears
      - Categorize each keyword as: topic, person, place, brand, action, or other
      - Return exactly 10 keywords sorted by frequency
      - Format the response as valid JSON matching this schema: ${JSON.stringify(KeywordsSchema.shape)}

      Comments:
      ${commentsText}`

      const response = await askOllama(process.env.OLLAMA_MODEL_LLM!, prompt)
      const parsedResponse = JSON.parse(response)
      const result = KeywordsSchema.safeParse(parsedResponse)

      if (!result.success) {
        console.error("[v0] Invalid response format from Ollama:", result.error)
        throw new Error("Invalid response format from AI")
      }

      console.log("[v0] AI extracted keywords:", result.data.keywords.length)

      return NextResponse.json({
        success: true,
        keywords: result.data.keywords,
      })
    } catch (aiError) {
      console.error("[v0] AI extraction failed, using fallback method", aiError)
      // Fallback implementation remains the same
      const stopwords = new Set([
        "yang", "dan", "ini", "itu", "dari", "untuk", "dengan", "pada", "adalah", "akan",
        "sudah", "telah", "juga", "atau", "tidak", "ada", "bisa", "harus", "dapat", "saya",
        "anda", "kamu", "dia", "mereka", "kami", "kita", "the", "and", "for", "with", "this",
        "that", "from", "have", "been", "were", "their", "there", "what", "when", "where",
        "which", "will", "would", "could", "should"
      ])

      const words = commentsText
        .toLowerCase()
        .match(/\b[a-z]{3,}\b/g)
        ?.filter((word) => !stopwords.has(word)) || []

      const wordCounts = new Map<string, number>()
      words.forEach((word) => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
      })

      const keywords = Array.from(wordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count, category: "topic" }))

      return NextResponse.json({
        success: true,
        keywords,
      })
    }
  } catch (error) {
    console.error("[v0] Error extracting keywords:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to extract keywords",
      },
      { status: 500 },
    )
  }
}