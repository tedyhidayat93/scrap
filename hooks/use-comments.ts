import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useComments(platform = "all", queries: string[] = []) {
  const queryString =
    queries.length > 0
      ? `&queries=${encodeURIComponent(queries.join(","))}`
      : "";
  const { data, error, isLoading, mutate } = useSWR(
    `/api/comments?platform=${platform}${queryString}`,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  return {
    comments: data?.data?.comments || [],
    totalComments: data?.data?.totalComments || 0,
    realComments: data?.data?.realComments || 0,
    botComments: data?.data?.botComments || 0,
    sentimentCounts: data?.data?.sentimentCounts || {
      positive: 0,
      negative: 0,
      neutral: 0,
    },
    platformBreakdown: data?.data?.platformBreakdown || {},
    isLoading,
    isError: error,
    refresh: mutate,
  };
}
