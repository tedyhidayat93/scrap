import { askOllama } from "@/lib/ollama-client"
import { z } from "zod"
import { NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"

const KeywordsSchema = z.object({
  keywords: z.array(
    z.object({
      word: z.string().describe("A meaningful keyword"),
      count: z.number().describe("Frequency of this keyword"),
      category: z.string().describe("Category: topic, person, place, brand, action, or other"),
    }),
  ),
})


/* Extract JSON safely */
function extractJson(text: string) {
  try {
    const match =
      text.match(/```json\n([\s\S]*?)\n```/) ||
      text.match(/```([\s\S]*?)```/) ||
      text.match(/{[\s\S]*}/)

    if (!match) throw new Error("No JSON inside response")

    const cleaned = match[0].replace(/```json|```/g, "").trim()
    return JSON.parse(cleaned)
  } catch {
    throw new Error("Invalid JSON from AI")
  }
}

export async function POST(request: Request) {
  try {
    const { comments } = await request.json()

    if (!comments || !Array.isArray(comments)) {
      return NextResponse.json(
        { success: false, error: "Invalid comments data" },
        { status: 400 }
      )
    }

    const sampleSize = Math.min(comments.length, 100)
    const sampledComments = comments.slice(0, sampleSize)
    const commentsText = sampledComments.map((c: any) => c.text || "").join("\n")

    const prompt = `
Extract the top 10 meaningful keywords from these comments.

Rules:
- Only extract nouns, verbs, entities (people, places, brands)
- Skip stopwords, pronouns, conjunctions
- Count occurrences
- Categorize keyword as: topic, person, place, brand, action, other
- Return JSON only with this schema:
${JSON.stringify(KeywordsSchema.shape)}

Comments:
${commentsText}
`

    console.log("[AI] Extracting keywords using Ollama...")

    /* ---------------------------------------------------
     * 1. TRY OLLAMA FIRST
     * --------------------------------------------------- */
    try {
      const raw = await askOllama(process.env.OLLAMA_MODEL_LLM!, prompt)
      const parsed = extractJson(raw)

      const validated = KeywordsSchema.safeParse(parsed)
      if (!validated.success) throw new Error("Ollama returned invalid schema")

      return NextResponse.json({
        success: true,
        keywords: validated.data.keywords,
      })
    } catch (err) {
      console.error("[AI] Ollama failed → fallback to OpenAI", err)
    }

    /* ---------------------------------------------------
     * 2. FALLBACK → OPENAI
     * --------------------------------------------------- */
    try {
      console.log("[AI] Extracting with OpenAI...")

      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: KeywordsSchema,
        prompt,
        temperature: 0.2,
      })

      return NextResponse.json({
        success: true,
        keywords: object.keywords,
      })
    } catch (err) {
      console.error("[AI] OpenAI fallback failed → using manual fallback", err)
    }

    /* ---------------------------------------------------
     * 3. LAST RESORT → MANUAL FALLBACK
     * --------------------------------------------------- */

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
      ?.filter((w) => !stopwords.has(w)) || []

    const wordCounts = new Map<string, number>()
    words.forEach((w) => {
      wordCounts.set(w, (wordCounts.get(w) || 0) + 1)
    })

    const keywords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count, category: "topic" }))

    return NextResponse.json({ success: true, keywords })
  } catch (error) {
    console.error("[v0] Error extracting keywords:", error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to extract keywords",
      },
      { status: 500 }
    )
  }
}
