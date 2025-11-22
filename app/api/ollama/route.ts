// app/api/ollama/route.ts
export async function POST(req: Request) {
  try {
    const { model, prompt, stream = false } = await req.json();

    const res = await fetch("https://ollama.optimasi.ai/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, prompt, stream }),
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: "Failed request to Ollama" }),
        {
          status: res.status,
        }
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
