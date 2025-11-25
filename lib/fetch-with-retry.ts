export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  { retries = 3, backoff = 300 }: { retries?: number; backoff?: number } = {}
) {
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const text = await res.text();
        const err = new Error(`HTTP ${res.status}: ${text}`);
        // if 4xx, don't retry
        if (res.status >= 400 && res.status < 500) throw err;
        throw err;
      }
      return res.json();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      // exponential backoff
      await new Promise((r) => setTimeout(r, backoff * attempt));
    }
  }
}
