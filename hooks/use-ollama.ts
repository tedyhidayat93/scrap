// hooks/useOllama.ts
import { useState } from "react";
import { askOllama } from "@/lib/ollama-client";

export function useOllama() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async (model: string, prompt: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await askOllama(model, prompt);
      setResult(data);
      return data;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, result, error };
}
