"use client";

import { DashboardHeader } from "@/components/dashboard-header";
import { MetricsOverview } from "@/components/metrics-overview";
import { PlatformCharts } from "@/components/platform-charts";
import { SentimentAnalysis } from "@/components/sentiment-analysis";
import { RecentComments } from "@/components/recent-comments";
import { SearchQuery } from "@/components/search-query";
import { NarrativeDetection } from "@/components/narrative-detection";
import { CounterNarrativeComments } from "@/components/counter-narrative-comments";
import { AccountRiskAnalysis } from "@/components/account-risk-analysis";
import { CrawlingLog } from "@/components/crawling-log";
import { RecentVideos } from "@/components/recent-videos";
import { ProComments } from "@/components/pro-comments";
import { ContraComments } from "@/components/contra-comments";
import { IntelligenceAnalysis } from "@/components/intelligence-analysis";
import { useState, useEffect, useRef } from "react";
import { useTikTokComments } from "@/hooks/use-tiktok-comments";
import { PlatformType, QueryType } from "@/interfaces/global";
import { useSearchHistory } from "@/context/search-history-context";

export default function Page() {
  const [query, setQuery] = useState<string>("");
  const [queryType, setQueryType] = useState<"username" | "video" | "keyword">(
    "username"
  );
  const [latestOnly, setLatestOnly] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [additionalComments, setAdditionalComments] = useState<any[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const hasLoadedMore = useRef(false);
  const [platform, setPlatform] = useState<PlatformType>("");
  const [crawlingLogs, setCrawlingLogs] = useState<
    Array<{
      timestamp: string;
      type: "info" | "success" | "error" | "warning";
      message: string;
    }>
  >([]);
  const { addHistory } = useSearchHistory()

  const apiData = useTikTokComments(
    query,
    queryType,
    !hasLoadedMore.current,
    latestOnly
  );

  useEffect(() => {
    if (apiData.cursor !== undefined && apiData.cursor !== null) {
      console.log("[v0] Setting initial cursor from API:", apiData.cursor);
      setCursor(apiData.cursor);
      setHasMore(apiData.hasMore);
    }
  }, [apiData.cursor, apiData.hasMore]);

  const handleSearch = (
    newQuery: string,
    newPlatform: PlatformType,
    type: QueryType,
    latest = false
  ) => {
    setIsAnalyzing(true);
    setPlatform(newPlatform);
    setQuery(newQuery);
    setQueryType(type);
    setLatestOnly(latest);

    addHistory({
      platform,
      query,
      content: `Searching for ${type} on ${platform}`,
      datetime: new Date().toISOString()
    })

    setCrawlingLogs([
      {
        timestamp: new Date().toLocaleTimeString(),
        type: "info",
        message: `Starting analysis for ${newPlatform} type ${type}: ${newQuery}`,
      },
    ]);

    setTimeout(() => setIsAnalyzing(false), 1200);
  };

  useEffect(() => {
    if (apiData.isLoading) {
      setCrawlingLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: "info",
          message: "Fetching data from TikTok API...",
        },
      ]);
    } else if (apiData.error) {
      setCrawlingLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: "error",
          message: `Error: ${apiData.error}`,
        },
      ]);
    } else if (apiData.totalComments > 0) {
      setCrawlingLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: "success",
          message: `Successfully fetched ${
            apiData.totalComments
          } comments from ${apiData.videosAnalyzed || 1} video(s)`,
        },
      ]);
    }
  }, [
    apiData.isLoading,
    apiData.error,
    apiData.totalComments,
    apiData.videosAnalyzed,
  ]);

  const handleLoadMore = async () => {
    if (!apiData.videoUrl || isLoadingMore || !hasMore) return;

    console.log("[v0] Loading more with cursor:", cursor);

    setIsLoadingMore(true);
    hasLoadedMore.current = true;

    try {
      const response = await fetch("/api/load-more-comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl: apiData.videoUrl,
          cursor: cursor,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(
          "[v0] Loaded",
          result.data.comments.length,
          "more comments"
        );
        console.log("[v0] Next cursor:", result.data.cursor);

        setAdditionalComments((prev) => [...prev, ...result.data.comments]);
        setCursor(result.data.cursor);
        setHasMore(result.data.hasMore);
      } else {
        console.error("[v0] Failed to load more comments:", result.error);
        setHasMore(false);
      }
    } catch (error) {
      console.error("[v0] Error loading more comments:", error);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const allComments = [...apiData.comments, ...additionalComments];
  const totalComments = apiData.totalComments + additionalComments.length;
  const uniqueUsers = new Set(
    [...apiData.comments, ...additionalComments].map(
      (c) => c.user?.unique_id || c.user?.id
    )
  ).size;
  const uniqueUsersList = new Set(
    [...apiData.comments, ...additionalComments].map(
      (c) => c.user?.unique_id || c.user?.id
    )
  ) as any;
  const realComments = apiData.realComments + additionalComments.filter((c) => !c.isBot).length;
  const botComments = totalComments - realComments;

  const allCommentsData = [...apiData.comments, ...additionalComments];
  const sentimentCounts = {
    positive: allCommentsData.filter((c) => c.sentiment === "positive").length,
    negative: allCommentsData.filter((c) => c.sentiment === "negative").length,
    neutral: allCommentsData.filter((c) => c.sentiment === "neutral").length,
  };

  const enhancedData = {
    ...apiData,
    comments: allComments,
    totalComments,
    realComments,
    botComments,
    uniqueUsersList,
    uniqueUsers,
    sentimentCounts,
    queryType,
    videosAnalyzed: apiData.videosAnalyzed,
    isLoading: Boolean(apiData.isLoading),
  };

  return (
    <div className="min-h-screen">
      {/* <DashboardHeader username={query} type={queryType} /> */}
      <main className="container h-screen mx-auto p-6 space-y-6 cyber-grid">
        <SearchQuery
          onSearch={handleSearch}
          currentQuery={query}
          queryType={queryType}
          isLoading={isAnalyzing}
        />

        {query ? (
          <div className="space-y-6">
            <CrawlingLog
              logs={crawlingLogs}
              isActive={isAnalyzing || !!apiData.isLoading}
            />

            {apiData.totalComments > 0 && (
              <>
                <MetricsOverview data={enhancedData} />

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <PlatformCharts data={enhancedData} />
                    <SentimentAnalysis data={enhancedData} />
                  </div>
                  <RecentVideos
                    data={{
                      videos: apiData.videos,
                      isLoading: Boolean(apiData.isLoading),
                    }}
                  />
                </div>

                <RecentComments
                  data={enhancedData}
                  onLoadMore={handleLoadMore}
                  isLoadingMore={isLoadingMore}
                  hasMore={hasMore && queryType === "video"}
                />

                <IntelligenceAnalysis data={enhancedData} />

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <NarrativeDetection data={enhancedData} />
                    <CounterNarrativeComments data={enhancedData} />
                  </div>
                  <div className="space-y-4">
                    <ProComments data={enhancedData} />
                    <ContraComments data={enhancedData} />
                  </div>
                </div>

                <AccountRiskAnalysis data={enhancedData} />
              </>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
