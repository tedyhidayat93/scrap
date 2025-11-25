import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

async function callOpenAI(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional communications analyst and headline writer. Produce concise JSON according to the user's instructions.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${txt}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  return content;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topic = body.topic || "";
    const count = Number(body.count) || 20;

    // Read prompt template from components/prompt-counter-narrative.txt
    const templatePath = path.join(
      process.cwd(),
      "components",
      "prompt-counter-narrative.txt"
    );
    let tpl = "";
    try {
      tpl = await fs.readFile(templatePath, "utf-8");
    } catch (err) {
      console.warn("Prompt template not found, using inline fallback");
      tpl = `Anda adalah seorang analis komunikasi strategis dan penulis berita profesional.\nTugas Anda adalah membuat satu rekomendasi judul berita yang berfungsi sebagai _counter narrative_ untuk melawan narasi negatif atau menyesatkan.\nTopik yang dianalisis:\n\"$video|username|keyword\"\nFormatkan respons dalam JSON dengan struktur berikut:\n{"results": ["<list judul >"]}`;
    }

    const prompt = tpl.replace("$video|username|keyword", topic);

    const text = await callOpenAI(prompt);

    let results: string[] = [];
    if (!text) throw new Error("Empty response from model");

    // Try parse as JSON (model instructed to return JSON)
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.results)) {
        results = parsed.results.map((r: any) => String(r).trim());
      }
    } catch (err) {
      // Fallback: split by newlines and strip bullets
      const lines = text
        .split(/\r?\n/)
        .map((l: string) => l.replace(/^\s*[-•\d\.]+\s*/, "").trim())
        .filter((l: string) => l.length > 0);
      results = lines;
    }

    // Ensure we have at most `count` items
    results = results.slice(0, count);

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error("/api/generate-counter-narrative error:", err);
    return NextResponse.json(
      { success: false, error: String(err.message || err) },
      { status: 500 }
    );
  }
}
