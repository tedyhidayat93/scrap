import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useAnalytics(queries: string[] = []) {
  const queryString = queries.length > 0 ? `?queries=${encodeURIComponent(queries.join(","))}` : ""
  const { data, error, isLoading, mutate } = useSWR(`/api/analytics${queryString}`, fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  })

  return {
    totalUsers: data?.data?.totalUsers || 0,
    totalEngagement: data?.data?.totalEngagement || 0,
    platforms: data?.data?.platforms || {},
    isLoading,
    isError: error,
    refresh: mutate,
  }
}
