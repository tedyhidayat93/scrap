export async function askOllama(model: string, prompt: string) {
  if (!model) {
    throw new Error("[v0] Missing Ollama model name");
  }

  console.log("[v0] Asking Ollama:", { model });
  
  if (!prompt) {
    throw new Error("[v0] Missing Ollama prompt");
  }

  console.log("[v0] Asking Ollama:", { model });

  const res = await fetch("https://ollama.optimasi.ai/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  const raw = await res.text();
  console.log("[v0] RAW OLLAMA RESPONSE:", raw);

  if (!res.ok) {
    throw new Error("Ollama API returned error: " + raw);
  }

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error("Invalid JSON from Ollama: " + raw);
  }

  if (!data?.response) {
    throw new Error("Ollama missing response field: " + raw);
  }

  return data.response;
}
