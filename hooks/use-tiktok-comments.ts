import useSWR from "swr";

const fetcher = async (url: string) => {
  console.log("[v0] Fetching from:", url);
  const res = await fetch(url);
  const data = await res.json();
  console.log("[v0] Hook received data:", data);

  if (!data.success) {
    throw new Error(data.error || "API request failed");
  }

  return data;
};

export function useTikTokComments(
  query: string,
  type: "username" | "video" | "keyword",
  enabled = true,
  latestOnly = false
) {
  const shouldFetch =
    query &&
    query.length > 0 &&
    type &&
    (type === "username" || type === "video" || type === "keyword") &&
    enabled;

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch
      ? `/api/tiktok-user-comments?query=${encodeURIComponent(
          query
        )}&type=${type}&latestOnly=${latestOnly}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      dedupingInterval: 30000,
      shouldRetryOnError: false,
      onError: (err) => {
        console.log("[v0] SWR Error:", err);
      },
      onSuccess: (data) => {
        console.log("[v0] SWR Success:", data);
      },
    }
  );

  return {
    handle: data?.data?.handle || data?.data?.keyword || query,
    videosAnalyzed: data?.data?.videosAnalyzed || 0,
    totalVideos: data?.data?.totalVideos || 0,
    comments: data?.data?.comments || [],
    totalComments: data?.data?.totalComments || 0,
    realComments: data?.data?.realComments || 0,
    botComments: data?.data?.botComments || 0,
    uniqueUsers: data?.data?.uniqueUsers || 0,
    sentimentCounts: data?.data?.sentimentCounts || {
      positive: 0,
      negative: 0,
      neutral: 0,
    },
    platformBreakdown: data?.data?.platformBreakdown || {},
    queryType: data?.data?.queryType || type,
    videoUrl: data?.data?.videoUrl,
    cursor: data?.data?.cursor || null,
    hasMore: data?.data?.hasMore || false,
    videoStats: data?.data?.videoStats || null,
    videos: data?.data?.videos || [],
    isLoading: shouldFetch && isLoading,
    isError: error,
    error: error?.message,
    errorData: data?.success === false ? data : null,
    hasData: !!data?.success,
    refresh: mutate,
  };
}
