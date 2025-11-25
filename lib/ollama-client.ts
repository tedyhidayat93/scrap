export async function askOllama(model: string, prompt: string) {

  console.log("[v0] Asking Ollama with model:", model)
  console.log("[v0] Asking Ollama with prompt:", prompt)
  const res = await fetch("https://ollama.optimasi.ai/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  const data = await res.json();
  return data.response;
}
