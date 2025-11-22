// lib/ollamaClient.ts
export async function askOllama(model: string, prompt: string, stream = false) {
  const res = await fetch("/api/ollama", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, prompt, stream }),
  });

  if (!res.ok) {
    throw new Error(`Client request failed: ${res.status}`);
  }

  return res.json();
}
