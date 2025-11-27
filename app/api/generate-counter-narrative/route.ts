import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import { z } from "zod"
import { askOllama } from "@/lib/ollama-client"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"

/* ---------------------------------------------------
 * SCHEMA OUTPUT
 * --------------------------------------------------- */
const CounterSchema = z.object({
  results: z.array(z.string().describe("Judul counter narrative")),
})

/* ---------------------------------------------------
 * SAFE JSON EXTRACTION
 * --------------------------------------------------- */
function extractJson(text: string) {
  try {
    const match =
      text.match(/```json\n([\s\S]*?)\n```/) ||
      text.match(/```([\s\S]*?)```/) ||
      text.match(/{[\s\S]*}/)

    if (!match) throw new Error("No JSON found")
    const cleaned = match[1] || match[0]

    return JSON.parse(cleaned.replace(/```json|```/g, "").trim())
  } catch {
    throw new Error("Invalid JSON from AI")
  }
}

/* ---------------------------------------------------
 * TRY OLLAMA
 * --------------------------------------------------- */
async function tryOllama(prompt: string) {
  try {
    const model = process.env.OLLAMA_MODEL_LLM || "llama3"
    const raw = await askOllama(model, prompt)

    const json = extractJson(raw)
    const validated = CounterSchema.safeParse(json)

    if (!validated.success) throw new Error("Schema mismatch")

    return validated.data.results
  } catch (err) {
    console.error("[Ollama] Failed:", err)
    return null
  }
}

/* ---------------------------------------------------
 * TRY OPENAI FALLBACK
 * --------------------------------------------------- */
async function tryOpenAI(prompt: string) {
  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: CounterSchema,
      prompt,
      temperature: 0.3,
    })

    return object.results
  } catch (err) {
    console.error("[OpenAI] Failed:", err)
    return null
  }
}

/* ---------------------------------------------------
 * MANUAL FALLBACK TERAKHIR
 * --------------------------------------------------- */
function manualFallback(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•\d\.]+\s*/, "").trim())
    .filter((l) => l.length > 0)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const topic = body.topic || ""
    const count = Number(body.count) || 20

    /* ------------------------------------------
     * LOAD TEMPLATE PROMPT
     * ------------------------------------------ */
    const templatePath = path.join(
      process.cwd(),
      "components",
      "prompt-counter-narrative.txt"
    )

    let tpl = ""
    try {
      tpl = await fs.readFile(templatePath, "utf-8")
    } catch {
      tpl = `Anda adalah seorang analis komunikasi strategis. 
Buat judul counter narrative untuk topik: "$video|username|keyword".
Format JSON:
{"results": ["judul 1", "judul 2"]}`
    }

    const prompt = tpl.replace("$video|username|keyword", topic)

    /* ------------------------------------------
     * 1. TRY OLLAMA
     * ------------------------------------------ */
    let results: string[] | null = await tryOllama(prompt)

    /* ------------------------------------------
     * 2. FALLBACK → OPENAI
     * ------------------------------------------ */
    if (!results) {
      results = await tryOpenAI(prompt)
    }

    /* ------------------------------------------
     * 3. LAST RESORT → MANUAL PARSING FALLBACK
     * ------------------------------------------ */
    if (!results) {
      console.warn("[Manual Fallback] Using last-resort extractor")

      const raw = await askOllama("llama3", prompt).catch(() => "")
      results = manualFallback(raw || "Tidak dapat menghasilkan hasil")
    }

    results = results.slice(0, count)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (err: any) {
    console.error("[API ERROR]", err)
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Unexpected error",
      },
      { status: 500 }
    )
  }
}
